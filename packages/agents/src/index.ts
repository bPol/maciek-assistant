import { createFinanceAgent } from "./agents/finance.js";
import { createTodoAgent } from "./agents/todo.js";
export { createClickUpRestProvider } from "./providers/clickup.js";
export { createFlowtlyMcpProvider } from "./providers/flowtly.js";
export { createFinanceAgent } from "./agents/finance.js";
export { createTodoAgent } from "./agents/todo.js";

export type AgentContext = {
  userId: string;
  input: string;
  memory: Record<string, unknown>;
};

export type AgentResult = {
  reply: string;
  handoff?: string;
  metadata?: Record<string, unknown>;
};

export type Agent = {
  id: string;
  description: string;
  visible?: boolean;
  canHandle: (ctx: AgentContext) => boolean;
  handle: (ctx: AgentContext) => AgentResult | Promise<AgentResult>;
};

export type IntentDecision = {
  agentId: string;
  reason?: string;
};

export type IntentRouter = (params: {
  ctx: AgentContext;
  agents: Agent[];
}) => Promise<IntentDecision | null>;

export type Assistant = {
  register: (agent: Agent) => void;
  listAgents: () => Agent[];
  route: (
    ctx: AgentContext
  ) => Promise<{ agent: Agent; result: AgentResult }>;
};

type GeminiGenerateResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
};

const readProcessEnv = () => {
  if (typeof process === "undefined" || !process.env) {
    return undefined;
  }
  return process.env;
};

const readViteEnv = () => {
  try {
    return (import.meta as { env?: Record<string, string> }).env;
  } catch {
    return undefined;
  }
};

const getGeminiApiKey = () => {
  const viteEnv = readViteEnv();
  const processEnv = readProcessEnv();
  return (
    viteEnv?.VITE_GEMINI_API_KEY ??
    processEnv?.GEMINI_API_KEY ??
    processEnv?.VITE_GEMINI_API_KEY
  );
};

const extractJsonObject = (text: string) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return null;
  }
  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice) as IntentDecision;
  } catch {
    return null;
  }
};

const createGeminiIntentRouter = (apiKey: string): IntentRouter => {
  return async ({ ctx, agents }) => {
    const agentList = agents
      .map((agent) => `- ${agent.id}: ${agent.description}`)
      .join("\n");

    const prompt = [
      "You are a routing assistant for a multi-agent system.",
      "Pick the best agent id for the user's request.",
      "Return ONLY valid JSON: {\"agentId\": \"<id>\", \"reason\": \"<short reason>\"}.",
      "",
      `User input: ${JSON.stringify(ctx.input)}`,
      "Agents:",
      agentList
    ].join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0 }
        })
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Gemini routing error: ${response.status} ${response.statusText} ${body}`
      );
    }

    const data = (await response.json()) as GeminiGenerateResponse;
    const text =
      data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ??
      "";
    if (!text) {
      return null;
    }

    const parsed = extractJsonObject(text);
    if (!parsed || typeof parsed.agentId !== "string") {
      return null;
    }

    return parsed;
  };
};

const resolveIntentRouter = (ctx: AgentContext) => {
  const memory = ctx.memory as Record<string, unknown>;
  if (typeof memory.intentRouter === "function") {
    return memory.intentRouter as IntentRouter;
  }
  const apiKey = getGeminiApiKey();
  if (apiKey) {
    return createGeminiIntentRouter(apiKey);
  }
  return null;
};

export const createAssistant = (): Assistant => {
  const agents: Agent[] = [];

  const register = (agent: Agent) => {
    if (agents.some((a) => a.id === agent.id)) {
      throw new Error(`Agent already registered: ${agent.id}`);
    }
    agents.push(agent);
  };

  const listAgents = () => agents.filter((agent) => agent.visible !== false);

  const route = async (ctx: AgentContext) => {
    const intentRouter = resolveIntentRouter(ctx);
    let selectedAgent: Agent | undefined;

    if (intentRouter) {
      try {
        const decision = await intentRouter({ ctx, agents });
        if (decision?.agentId) {
          selectedAgent = agents.find((agent) => agent.id === decision.agentId);
        }
      } catch (error) {
        void error;
      }
    }

    const agent = selectedAgent ?? agents.find((a) => a.canHandle(ctx)) ?? agents[0];
    if (!agent) {
      throw new Error("No agents registered");
    }
    const result = await agent.handle(ctx);
    return { agent, result };
  };

  return { register, listAgents, route };
};

export const createDefaultAgents = (): Agent[] => [
  createTodoAgent(),
  createFinanceAgent(),
  {
    id: "planner",
    description: "Breaks down tasks into steps and timelines.",
    visible: false,
    canHandle: (ctx) => /plan|roadmap|steps|outline/i.test(ctx.input),
    handle: (ctx) => ({
      reply: `Plan: clarify goals, list constraints, draft steps, confirm timeline.`,
      metadata: { input: ctx.input }
    })
  },
  {
    id: "researcher",
    description: "Summarizes unknowns and lists what to verify.",
    visible: false,
    canHandle: (ctx) => /research|find|look up|verify/i.test(ctx.input),
    handle: (ctx) => ({
      reply: "Research: identify sources, collect facts, summarize findings.",
      metadata: { input: ctx.input }
    })
  },
  {
    id: "executor",
    description: "Provides direct answers and concrete next actions.",
    visible: false,
    canHandle: () => true,
    handle: (ctx) => ({
      reply: `Got it. Next actions: clarify scope, draft deliverable, iterate.`,
      metadata: { input: ctx.input }
    })
  }
];

export const createDefaultAssistant = (): Assistant => {
  const assistant = createAssistant();
  for (const agent of createDefaultAgents()) {
    assistant.register(agent);
  }
  return assistant;
};
