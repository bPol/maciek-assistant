#!/usr/bin/env node
import { createDefaultAssistant } from "@maciek/agents";
const input = process.argv.slice(2).join(" ").trim();
if (!input) {
    console.log("Usage: maciek <message>");
    process.exit(0);
}
const assistant = createDefaultAssistant();
const { agent, result } = assistant.route({
    userId: "local",
    input,
    memory: {}
});
console.log(`[${agent.id}] ${result.reply}`);
//# sourceMappingURL=index.js.map