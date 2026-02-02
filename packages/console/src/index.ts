#!/usr/bin/env node
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAgentMemoryFromEnv, createDefaultAssistant } from "@maciek/agents";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: resolve(rootDir, ".env") });

const input = process.argv.slice(2).join(" ").trim();

if (!input) {
  console.log("Usage: maciek <message>");
  process.exit(0);
}

const assistant = createDefaultAssistant();
const providerMemory = buildAgentMemoryFromEnv();

const run = async () => {
  const { agent, result } = await assistant.route({
    userId: "local",
    input,
    memory: providerMemory
  });

  console.log(`[${agent.id}] ${result.reply}`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
