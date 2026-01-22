import type { AgentContext } from "../index.js";
export type ClickUpConfig = {
    apiToken: string;
    listIds: string[];
    assigneeId?: string;
    includeClosed?: boolean;
    dueInDays?: number;
    baseUrl?: string;
};
export declare const createClickUpRestProvider: (config: ClickUpConfig) => {
    listTasks: (_ctx: AgentContext) => Promise<{
        id: string;
        name: string;
        status: string | undefined;
        dueAt: string | undefined;
        priority: string | undefined;
        url: string | undefined;
    }[]>;
};
//# sourceMappingURL=clickup.d.ts.map