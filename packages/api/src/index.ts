import dotenv from "dotenv";
import http from "node:http";
import { dirname, resolve } from "node:path";
import { URL, fileURLToPath } from "node:url";
import {
  buildAgentMemoryFromEnv,
  createDefaultAssistant
} from "@maciek/agents";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: resolve(rootDir, ".env") });

type RouteRequest = {
  input: string;
  userId?: string;
};

const assistant = createDefaultAssistant();

type StoredMessage = {
  role: "user" | "agent";
  text: string;
  agentId?: string;
  at: string;
};

type StoredState = {
  memory?: Record<string, unknown>;
  messages?: StoredMessage[];
  updatedAt?: string;
};

const firestoreConfig = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.GCP_PROJECT_ID;
  const collection = process.env.FIRESTORE_COLLECTION ?? "assistant";
  const docId = process.env.FIRESTORE_DOC_ID ?? "global";
  const maxMessages = Number(process.env.FIRESTORE_MAX_MESSAGES ?? 200);

  return { projectId, collection, docId, maxMessages };
};

const firestore = (() => {
  const { projectId } = firestoreConfig();
  if (!projectId) return null;
  const app = initializeApp({
    credential: applicationDefault(),
    projectId
  });
  return getFirestore(app);
})();

const providerMemory = buildAgentMemoryFromEnv();

const readStoredState = async (): Promise<StoredState> => {
  if (!firestore) return {};
  const { collection, docId } = firestoreConfig();
  const doc = await firestore.collection(collection).doc(docId).get();
  if (!doc.exists) return {};
  return (doc.data() as StoredState) ?? {};
};

const writeStoredState = async (state: StoredState) => {
  if (!firestore) return;
  const { collection, docId } = firestoreConfig();
  await firestore.collection(collection).doc(docId).set(state, { merge: true });
};

const mergeMemory = (stored: Record<string, unknown> | undefined) => ({
  ...(stored ?? {}),
  ...providerMemory
});

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

      const stored = await readStoredState();
      const memory = mergeMemory(stored.memory);

      const { agent, result } = await assistant.route({
        userId: data.userId ?? "web",
        input: data.input,
        memory
      });

      const now = new Date().toISOString();
      const messages: StoredMessage[] = [
        ...(stored.messages ?? []),
        { role: "user", text: data.input, at: now } as const,
        { role: "agent", text: result.reply, agentId: agent.id, at: now } as const
      ];

      const { maxMessages } = firestoreConfig();
      const trimmedMessages =
        Number.isFinite(maxMessages) && maxMessages > 0
          ? messages.slice(-maxMessages)
          : messages;

      await writeStoredState({
        memory: {
          ...(stored.memory ?? {}),
          lastAgentId: agent.id,
          lastReply: result.reply,
          updatedAt: now
        },
        messages: trimmedMessages,
        updatedAt: now
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
