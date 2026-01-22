import { createClickUpRestProvider } from "./providers/clickup.js";
import { createFlowtlyMcpProvider } from "./providers/flowtly.js";
import type { AgentContext } from "./index.js";

const parseBoolean = (value: string | undefined): boolean | undefined => {
  if (value === undefined) return undefined;
  const lowered = value.toLowerCase();
  if (lowered === "true") return true;
  if (lowered === "false") return false;
  return undefined;
};

export const createClickUpProviderFromEnv = (env: NodeJS.ProcessEnv = process.env) => {
  const clickupToken = env.CLICKUP_API_TOKEN ?? env.CLICKUP_API_KEY ?? env.CLICKUP_API_CLIENT;
  const listIds = env.CLICKUP_LIST_IDS?.split(",").map((id) => id.trim()).filter(Boolean);

  if (!clickupToken || !listIds || listIds.length === 0) {
    return null;
  }

  return createClickUpRestProvider({
    apiToken: clickupToken,
    listIds,
    assigneeId: env.CLICKUP_ASSIGNEE_ID,
    includeClosed: parseBoolean(env.CLICKUP_INCLUDE_CLOSED),
    dueInDays: env.CLICKUP_DUE_DAYS ? Number(env.CLICKUP_DUE_DAYS) : undefined
  });
};

export const createFlowtlyProviderFromEnv = (env: NodeJS.ProcessEnv = process.env) => {
  if (!env.FLOWTLY_MCP_URL) {
    return null;
  }

  return createFlowtlyMcpProvider({
    baseUrl: env.FLOWTLY_MCP_URL,
    apiKey: env.FLOWTLY_MCP_API_KEY,
    clientId: env.FLOWTLY_MCP_CLIENT_ID,
    clientSecret: env.FLOWTLY_MCP_CLIENT_SECRET,
    workspaceId: env.FLOWTLY_WORKSPACE_ID
  });
};

export const buildAgentMemoryFromEnv = (
  env: NodeJS.ProcessEnv = process.env
): AgentContext["memory"] => {
  const memory: AgentContext["memory"] = {};

  const clickupProvider = createClickUpProviderFromEnv(env);
  if (clickupProvider) {
    memory.clickupProvider = clickupProvider;
  }

  const flowtlyProvider = createFlowtlyProviderFromEnv(env);
  if (flowtlyProvider) {
    memory.flowtlyProvider = flowtlyProvider;
  }

  return memory;
};
