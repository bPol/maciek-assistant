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
    canHandle: (ctx: AgentContext) => boolean;
    handle: (ctx: AgentContext) => AgentResult;
};
export type Assistant = {
    register: (agent: Agent) => void;
    listAgents: () => Agent[];
    route: (ctx: AgentContext) => {
        agent: Agent;
        result: AgentResult;
    };
};
export declare const createAssistant: () => Assistant;
export declare const createDefaultAgents: () => Agent[];
export declare const createDefaultAssistant: () => Assistant;
//# sourceMappingURL=index.d.ts.map