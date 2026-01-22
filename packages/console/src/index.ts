#!/usr/bin/env node
import { createClickUpRestProvider, createDefaultAssistant } from "@maciek/agents";

const input = process.argv.slice(2).join(" ").trim();

if (!input) {
  console.log("Usage: maciek <message>");
  process.exit(0);
}

const assistant = createDefaultAssistant();
const buildMemory = () => {
  const apiToken = process.env.CLICKUP_API_TOKEN;
  const listIds = process.env.CLICKUP_LIST_IDS?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!apiToken || !listIds || listIds.length === 0) {
    return {};
  }

  return {
    clickupProvider: createClickUpRestProvider({
      apiToken,
      listIds,
      assigneeId: process.env.CLICKUP_ASSIGNEE_ID,
      includeClosed: process.env.CLICKUP_INCLUDE_CLOSED === "true",
      dueInDays: process.env.CLICKUP_DUE_DAYS
        ? Number(process.env.CLICKUP_DUE_DAYS)
        : undefined
    })
  };
};

const run = async () => {
  const { agent, result } = await assistant.route({
    userId: "local",
    input,
    memory: buildMemory()
  });

  console.log(`[${agent.id}] ${result.reply}`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
