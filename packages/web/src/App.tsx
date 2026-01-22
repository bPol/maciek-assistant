import { useMemo, useState } from "react";
import {
  AgentContext,
  AgentResult,
  createDefaultAssistant
} from "@maciek/agents";

type Message = {
  id: string;
  role: "user" | "agent";
  agentId?: string;
  text: string;
};

const makeId = () => Math.random().toString(36).slice(2);

const App = () => {
  const assistant = useMemo(() => createDefaultAssistant(), []);
  const [input, setInput] = useState("");
  const [memory, setMemory] = useState<Record<string, unknown>>({});
  const [messages, setMessages] = useState<Message[]>([
    {
      id: makeId(),
      role: "agent",
      agentId: "system",
      text: "Hi! Ask me to plan, research, or execute a task."
    }
  ]);

  const agents = assistant.listAgents();

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: makeId(),
      role: "user",
      text: trimmed
    };

    const ctx: AgentContext = {
      userId: "local",
      input: trimmed,
      memory
    };

    const { agent, result } = assistant.route(ctx);
    const agentMessage: Message = {
      id: makeId(),
      role: "agent",
      agentId: agent.id,
      text: result.reply
    };

    setMessages((prev) => [...prev, userMessage, agentMessage]);
    setInput("");
    setMemory((prev) => ({ ...prev, last: result } as AgentResult & Record<string, unknown>));
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Maciek Assistant</h1>
          <p>Single-user console with multi-agent routing.</p>
        </div>
        <div className="agent-list">
          {agents.map((agent) => (
            <span key={agent.id} className="agent-pill">
              {agent.id}
            </span>
          ))}
        </div>
      </header>

      <main className="chat">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role === "user" ? "user" : "agent"}`}
          >
            {message.role === "agent" && message.agentId && (
              <span className="agent-tag">{message.agentId}</span>
            )}
            <p>{message.text}</p>
          </div>
        ))}
      </main>

      <footer className="composer">
        <input
          type="text"
          placeholder="Ask the assistant..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              sendMessage();
            }
          }}
        />
        <button type="button" onClick={sendMessage}>
          Send
        </button>
      </footer>
    </div>
  );
};

export default App;
