export const createAssistant = () => {
    const agents = [];
    const register = (agent) => {
        if (agents.some((a) => a.id === agent.id)) {
            throw new Error(`Agent already registered: ${agent.id}`);
        }
        agents.push(agent);
    };
    const listAgents = () => [...agents];
    const route = (ctx) => {
        const agent = agents.find((a) => a.canHandle(ctx)) ?? agents[0];
        if (!agent) {
            throw new Error("No agents registered");
        }
        const result = agent.handle(ctx);
        return { agent, result };
    };
    return { register, listAgents, route };
};
export const createDefaultAgents = () => [
    {
        id: "planner",
        description: "Breaks down tasks into steps and timelines.",
        canHandle: (ctx) => /plan|roadmap|steps|outline/i.test(ctx.input),
        handle: (ctx) => ({
            reply: `Plan: clarify goals, list constraints, draft steps, confirm timeline.`,
            metadata: { input: ctx.input }
        })
    },
    {
        id: "researcher",
        description: "Summarizes unknowns and lists what to verify.",
        canHandle: (ctx) => /research|find|look up|verify/i.test(ctx.input),
        handle: (ctx) => ({
            reply: "Research: identify sources, collect facts, summarize findings.",
            metadata: { input: ctx.input }
        })
    },
    {
        id: "executor",
        description: "Provides direct answers and concrete next actions.",
        canHandle: () => true,
        handle: (ctx) => ({
            reply: `Got it. Next actions: clarify scope, draft deliverable, iterate.`,
            metadata: { input: ctx.input }
        })
    }
];
export const createDefaultAssistant = () => {
    const assistant = createAssistant();
    for (const agent of createDefaultAgents()) {
        assistant.register(agent);
    }
    return assistant;
};
//# sourceMappingURL=index.js.map