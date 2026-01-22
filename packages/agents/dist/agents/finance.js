const isFlowtlyProvider = (value) => {
    if (!value || typeof value !== "object") {
        return false;
    }
    return typeof value.getSnapshot === "function";
};
const resolveProvider = (ctx) => {
    const memory = ctx.memory;
    if (isFlowtlyProvider(memory.flowtlyProvider)) {
        return memory.flowtlyProvider;
    }
    return null;
};
const summarizeSnapshot = (snapshot) => {
    const metrics = snapshot.metrics ?? [];
    const formatted = metrics.map((metric) => metric.delta
        ? `${metric.label}: ${metric.value} (${metric.delta})`
        : `${metric.label}: ${metric.value}`);
    return {
        headline: snapshot.asOf ? `Finance snapshot as of ${snapshot.asOf}.` : "Finance snapshot.",
        metrics: formatted.length ? formatted : ["No metrics returned yet."],
        notes: snapshot.notes ?? []
    };
};
const setupReply = () => [
    "I can connect to Flowtly once a provider is wired in.",
    "Add a Flowtly provider to AgentContext.memory as `flowtlyProvider`.",
    "That provider should expose `getSnapshot(ctx)` and return { asOf, metrics, notes }."
].join("\n");
export const createFinanceAgent = () => ({
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
        }
        catch (error) {
            return {
                reply: "I could not reach Flowtly. Check the provider configuration.",
                metadata: { connected: false, error: String(error) }
            };
        }
    }
});
//# sourceMappingURL=finance.js.map