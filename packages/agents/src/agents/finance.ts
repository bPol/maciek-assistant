import type { Agent, AgentContext } from "../index.js";
import type { FlowtlyProvider } from "../providers/flowtly.js";

type FinanceSummary = {
  headline: string;
  metrics: string[];
  notes: string[];
};

type GeminiGenerateResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
};

const isFlowtlyProvider = (value: unknown): value is FlowtlyProvider => {
  if (!value || typeof value !== "object") {
    return false;
  }
  return typeof (value as FlowtlyProvider).getSnapshot === "function";
};

const resolveProvider = (ctx: AgentContext): FlowtlyProvider | null => {
  const memory = ctx.memory as Record<string, unknown>;
  if (isFlowtlyProvider(memory.flowtlyProvider)) {
    return memory.flowtlyProvider;
  }
  return null;
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

const summarizeSnapshot = (snapshot: {
  asOf?: string;
  metrics?: { label: string; value: string | number; delta?: string }[];
  notes?: string[];
}): FinanceSummary => {
  const metrics = snapshot.metrics ?? [];
  const formatted = metrics.map((metric) =>
    metric.delta
      ? `${metric.label}: ${metric.value} (${metric.delta})`
      : `${metric.label}: ${metric.value}`
  );

  return {
    headline: snapshot.asOf ? `Finance snapshot as of ${snapshot.asOf}.` : "Finance snapshot.",
    metrics: formatted.length ? formatted : ["No metrics returned yet."],
    notes: snapshot.notes ?? []
  };
};

const summarizeWithGemini = async (
  snapshot: {
    asOf?: string;
    metrics?: { label: string; value: string | number; delta?: string }[];
    notes?: string[];
  },
  request: string
) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  const prompt = [
    "You are a finance assistant.",
    "Use only the data provided in the JSON to answer the user's request.",
    "Output plain text with 3-6 lines, no markdown, no bullet symbols.",
    "Line 1 must be 'Finance snapshot as of <asOf>.' or 'Finance snapshot.'",
    "Include each metric as 'Label: value' and include '(delta)' if present.",
    "If no metrics are provided, include the line 'No metrics returned yet.'",
    "If notes exist, add them as full sentences on the last lines.",
    "",
    `User request: ${request}`,
    `Snapshot JSON: ${JSON.stringify(snapshot)}`
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
    return null;
  }

  const data = (await response.json()) as GeminiGenerateResponse;
  const text =
    data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ??
    "";
  const trimmed = text.trim();
  return trimmed ? trimmed : null;
};

const setupReply = () =>
  [
    "I can connect to Flowtly once a provider is wired in.",
    "Add a Flowtly provider to AgentContext.memory as `flowtlyProvider`.",
    "That provider should expose `getSnapshot(ctx)` and return { asOf, metrics, notes }."
  ].join("\n");

export const createFinanceAgent = (): Agent => ({
  id: "finance",
  description: "Connects to Flowtly to summarize financial metrics.",
  canHandle: (ctx) => /finance|budget|cashflow|runway|spend|revenue|flowtly/i.test(ctx.input),
  handle: async (ctx) => {
    const provider = resolveProvider(ctx);
    if (!provider) {
      return { reply: setupReply(), metadata: { connected: false } };
    }

    try {
      const snapshot = await provider.getSnapshot(ctx);
      let reply = await summarizeWithGemini(snapshot, ctx.input);
      let summaryMode = "llm";
      if (!reply) {
        const summary = summarizeSnapshot(snapshot);
        reply = [summary.headline, ...summary.metrics, ...summary.notes].join("\n");
        summaryMode = "rules";
      }
      return {
        reply,
        metadata: { connected: true, summaryMode }
      };
    } catch (error) {
      return {
        reply: "I could not reach Flowtly. Check the provider configuration.",
        metadata: { connected: false, error: String(error) }
      };
    }
  }
});
