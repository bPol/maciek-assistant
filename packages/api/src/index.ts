import http from "node:http";
import { URL } from "node:url";
import {
  createClickUpRestProvider,
  createDefaultAssistant,
  createFlowtlyMcpProvider
} from "@maciek/agents";

type RouteRequest = {
  input: string;
  userId?: string;
};

const assistant = createDefaultAssistant();

const parseBoolean = (value: string | undefined): boolean | undefined => {
  if (value === undefined) return undefined;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return undefined;
};

const buildMemory = () => {
  const memory: Record<string, unknown> = {};

  const clickupToken =
    process.env.CLICKUP_API_TOKEN ??
    process.env.CLICKUP_API_KEY ??
    process.env.CLICKUP_API_CLIENT;

  const clickupListIds = process.env.CLICKUP_LIST_IDS?.split(",").map((id) => id.trim());

  if (clickupToken && clickupListIds && clickupListIds.length > 0) {
    memory.clickupProvider = createClickUpRestProvider({
      apiToken: clickupToken,
      listIds: clickupListIds,
      assigneeId: process.env.CLICKUP_ASSIGNEE_ID,
      includeClosed: parseBoolean(process.env.CLICKUP_INCLUDE_CLOSED),
      dueInDays: process.env.CLICKUP_DUE_DAYS
        ? Number(process.env.CLICKUP_DUE_DAYS)
        : undefined
    });
  }

  if (process.env.FLOWTLY_MCP_URL) {
    memory.flowtlyProvider = createFlowtlyMcpProvider({
      baseUrl: process.env.FLOWTLY_MCP_URL,
      apiKey: process.env.FLOWTLY_MCP_API_KEY,
      clientId: process.env.FLOWTLY_MCP_CLIENT_ID,
      clientSecret: process.env.FLOWTLY_MCP_CLIENT_SECRET,
      workspaceId: process.env.FLOWTLY_WORKSPACE_ID
    });
  }

  return memory;
};

const memory = buildMemory();

const jsonResponse = (res: http.ServerResponse, status: number, payload: unknown) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
};

const handleRoute = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  const chunks: Buffer[] = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", async () => {
    try {
      const body = chunks.length ? Buffer.concat(chunks).toString("utf-8") : "{}";
      const data = JSON.parse(body) as RouteRequest;
      if (!data.input || typeof data.input !== "string") {
        jsonResponse(res, 400, { error: "Missing input" });
        return;
      }

      const { agent, result } = await assistant.route({
        userId: data.userId ?? "web",
        input: data.input,
        memory
      });

      jsonResponse(res, 200, {
        agentId: agent.id,
        reply: result.reply,
        metadata: result.metadata ?? null
      });
    } catch (error) {
      jsonResponse(res, 500, { error: String(error) });
    }
  });
};

const handleAgents = (_req: http.IncomingMessage, res: http.ServerResponse) => {
  const agents = assistant.listAgents().map((agent) => ({
    id: agent.id,
    description: agent.description
  }));
  jsonResponse(res, 200, { agents });
};

const withCors = (res: http.ServerResponse) => {
  const origin = process.env.CORS_ORIGIN ?? "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.statusCode = 400;
    res.end();
    return;
  }

  withCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/healthz") {
    jsonResponse(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/agents") {
    handleAgents(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/route") {
    handleRoute(req, res);
    return;
  }

  jsonResponse(res, 404, { error: "Not found" });
});

const port = Number(process.env.PORT ?? 8080);
server.listen(port, () => {
  console.log(`API listening on ${port}`);
});
