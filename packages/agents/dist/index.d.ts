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
    route: (ctx: AgentContext) => Promise<{
        agent: Agent;
        result: AgentResult;
    }>;
};
export declare const createAssistant: () => Assistant;
export declare const createDefaultAgents: () => Agent[];
export declare const createDefaultAssistant: () => Assistant;
//# sourceMappingURL=index.d.ts.map