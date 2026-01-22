import type { Agent, AgentContext } from "./index.js";
import type { FlowtlyProvider } from "./flowtly.js";

type FinanceSummary = {
  headline: string;
  metrics: string[];
  notes: string[];
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
      const summary = summarizeSnapshot(snapshot);
      return {
        reply: [summary.headline, ...summary.metrics, ...summary.notes].join("\n"),
        metadata: { connected: true }
      };
    } catch (error) {
      return {
        reply: "I could not reach Flowtly. Check the provider configuration.",
        metadata: { connected: false, error: String(error) }
      };
    }
  }
});
