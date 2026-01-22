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

type FlowtlyMcpResponse = {
  output?: FlowtlySnapshot;
  error?: string;
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

export const createFlowtlyMcpProvider = (config: FlowtlyConfig): FlowtlyProvider => {
  const getSnapshot = async (_ctx: AgentContext) => {
    const response = await fetch(config.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
      },
      body: JSON.stringify({
        tool: "finance.snapshot",
        input: {
          workspaceId: config.workspaceId,
          clientId: config.clientId,
          clientSecret: config.clientSecret
        }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Flowtly MCP error: ${response.status} ${body}`);
    }

    const data = (await response.json()) as FlowtlyMcpResponse;
    if (!data.output) {
      throw new Error(data.error ?? "Flowtly MCP returned no output");
    }

    return data.output;
  };

  return { getSnapshot };
};
