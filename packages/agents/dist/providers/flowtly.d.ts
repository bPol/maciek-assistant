import type { AgentContext } from "../index.js";
type FlowtlyMetric = {
    label: string;
    value: string | number;
    delta?: string;
};
type FlowtlySnapshot = {
    asOf?: string;
    metrics: FlowtlyMetric[];
    notes?: string[];
};
export type FlowtlyConfig = {
    baseUrl: string;
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    workspaceId?: string;
};
export type FlowtlyProvider = {
    getSnapshot: (ctx: AgentContext) => Promise<FlowtlySnapshot>;
};
export declare const createFlowtlyMcpProvider: (config: FlowtlyConfig) => FlowtlyProvider;
export {};
//# sourceMappingURL=flowtly.d.ts.map