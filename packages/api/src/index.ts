import http from "node:http";
import { URL } from "node:url";
import {
  buildAgentMemoryFromEnv,
  createDefaultAssistant
} from "@maciek/agents";

type RouteRequest = {
  input: string;
  userId?: string;
};

const assistant = createDefaultAssistant();

const memory = buildAgentMemoryFromEnv();

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
const host = process.env.HOST ?? undefined;
server.listen(port, host, () => {
  console.log(`API listening on ${host ?? "0.0.0.0"}:${port}`);
});
