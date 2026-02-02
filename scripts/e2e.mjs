import assert from "node:assert/strict";

const apiBase = process.env.E2E_API_URL ?? "http://localhost:8080";

const log = (message) => {
  process.stdout.write(`${message}\n`);
};

const request = async (path, options) => {
  const response = await fetch(`${apiBase}${path}`, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, text, json };
};

const testHealth = async () => {
  log("[e2e] GET /healthz");
  const { response, json } = await request("/healthz");
  assert.equal(response.status, 200);
  assert.deepEqual(json, { ok: true });
};

const testAgents = async () => {
  log("[e2e] GET /api/agents");
  const { response, json } = await request("/api/agents");
  assert.equal(response.status, 200);
  assert.ok(json && Array.isArray(json.agents));
  const ids = json.agents.map((agent) => agent.id);
  assert.ok(ids.includes("todo"));
  assert.ok(ids.includes("finance"));
};

const testRouteExecutor = async () => {
  log("[e2e] POST /api/route (executor)");
  const { response, json } = await request("/api/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: "hello there" })
  });
  assert.equal(response.status, 200);
  assert.ok(json && json.agentId);
  assert.ok(typeof json.reply === "string");
};

const testRouteTodo = async () => {
  log("[e2e] POST /api/route (todo)");
  const { response, json } = await request("/api/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: "summarize my tasks" })
  });
  assert.equal(response.status, 200);
  assert.equal(json.agentId, "todo");
  assert.ok(typeof json.reply === "string");
};

const testRouteFinance = async () => {
  log("[e2e] POST /api/route (finance)");
  const { response, json } = await request("/api/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: "what is my cashflow" })
  });
  assert.equal(response.status, 200);
  assert.equal(json.agentId, "finance");
  assert.ok(typeof json.reply === "string");
  assert.ok(json.metadata && typeof json.metadata.connected === "boolean");
  if (json.metadata.connected) {
    assert.ok(["llm", "rules"].includes(json.metadata.summaryMode));
  }
};

const run = async () => {
  await testHealth();
  await testAgents();
  await testRouteExecutor();
  await testRouteTodo();
  await testRouteFinance();
  log("[e2e] OK");
};

run().catch((error) => {
  console.error("[e2e] FAILED", error);
  process.exit(1);
});
