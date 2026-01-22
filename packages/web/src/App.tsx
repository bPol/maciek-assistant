import { useEffect, useMemo, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "agent";
  agentId?: string;
  text: string;
};

type AuthState =
  | { status: "checking" }
  | { status: "unauthenticated"; error?: string }
  | { status: "authenticated"; email: string }
  | { status: "error"; error: string };

type JwtPayload = {
  aud?: string;
  email?: string;
  email_verified?: boolean;
  exp?: number;
  sub?: string;
};

const AUTH_STORAGE_KEY = "maciek-assistant-auth";
const apiBase = import.meta.env.VITE_API_URL ?? "";

const makeId = () => Math.random().toString(36).slice(2);

const parseAllowedEmails = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const decodeJwtPayload = (token: string): JwtPayload | null => {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "="));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
};

type AgentInfo = { id: string; description: string };

const App = () => {
  const [input, setInput] = useState("");
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: makeId(),
      role: "agent",
      agentId: "system",
      text: "Hi! Ask me to plan, research, or execute a task."
    }
  ]);
  const [auth, setAuth] = useState<AuthState>({ status: "checking" });
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const allowedEmails = useMemo(
    () => parseAllowedEmails(import.meta.env.VITE_ALLOWED_EMAILS),
    []
  );

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: makeId(),
      role: "user",
      text: trimmed
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await fetch(`${apiBase}/api/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed })
      });
      if (!response.ok) {
        throw new Error("Assistant request failed");
      }
      const data = (await response.json()) as {
        agentId: string;
        reply: string;
      };
      const agentMessage: Message = {
        id: makeId(),
        role: "agent",
        agentId: data.agentId,
        text: data.reply
      };
      setMessages((prev) => [...prev, agentMessage]);
      setApiError(null);
    } catch (err) {
      setApiError(String(err));
    }
  };

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await fetch(`${apiBase}/api/agents`);
        if (!response.ok) {
          throw new Error("Unable to load agents");
        }
        const data = (await response.json()) as { agents: AgentInfo[] };
        setAgents(data.agents);
      } catch (err) {
        setApiError(String(err));
      }
    };

    loadAgents();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      setAuth({ status: "unauthenticated" });
      return;
    }
    try {
      const parsed = JSON.parse(stored) as JwtPayload & { email?: string };
      if (!parsed.email || (parsed.exp && Date.now() / 1000 > parsed.exp)) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setAuth({ status: "unauthenticated" });
        return;
      }
      if (allowedEmails.length && !allowedEmails.includes(parsed.email.toLowerCase())) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setAuth({ status: "unauthenticated" });
        return;
      }
      setAuth({ status: "authenticated", email: parsed.email });
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setAuth({ status: "unauthenticated" });
    }
  }, [allowedEmails]);

  useEffect(() => {
    if (auth.status === "authenticated") return;
    if (!clientId) {
      setAuth({
        status: "error",
        error: "Missing VITE_GOOGLE_CLIENT_ID in packages/web/.env"
      });
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();

    const handleCredential = (response: { credential: string }) => {
      const payload = decodeJwtPayload(response.credential);
      if (!payload?.email) {
        setAuth({ status: "unauthenticated", error: "Unable to read Google profile email." });
        return;
      }
      if (payload.aud && payload.aud !== clientId) {
        setAuth({ status: "unauthenticated", error: "Google client mismatch." });
        return;
      }
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        setAuth({ status: "unauthenticated", error: "Google session expired." });
        return;
      }
      if (allowedEmails.length && !allowedEmails.includes(payload.email.toLowerCase())) {
        setAuth({
          status: "unauthenticated",
          error: "This Google account is not authorized."
        });
        return;
      }

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ email: payload.email, exp: payload.exp, sub: payload.sub })
      );
      setAuth({ status: "authenticated", email: payload.email });
    };

    const tick = () => {
      if (cancelled) return;
      if (window.google?.accounts?.id && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
          cancel_on_tap_outside: true
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          type: "standard"
        });
        if (auth.status === "checking") {
          setAuth({ status: "unauthenticated" });
        }
        return;
      }
      if (Date.now() - startedAt > 4000) {
        setAuth({
          status: "error",
          error: "Google Identity Services failed to load."
        });
        return;
      }
      setTimeout(tick, 60);
    };

    tick();

    return () => {
      cancelled = true;
    };
  }, [auth.status, clientId, allowedEmails]);

  const signOut = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.google?.accounts?.id?.disableAutoSelect?.();
    setAuth({ status: "unauthenticated" });
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

      {auth.status === "authenticated" ? (
        <>
          <main className="chat">
            {apiError && (
              <div className="message agent">
                <span className="agent-tag">error</span>
                <p>{apiError}</p>
              </div>
            )}
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
        </>
      ) : (
        <main className="auth-shell">
          <div className="auth-card">
            <h2>Sign in required</h2>
            <p>Access is limited to authorized Google accounts.</p>
            <div ref={googleButtonRef} className="google-button" />
            {auth.status === "unauthenticated" && auth.error && (
              <p className="auth-error">{auth.error}</p>
            )}
            {auth.status === "error" && <p className="auth-error">{auth.error}</p>}
          </div>
        </main>
      )}

      {auth.status === "authenticated" && (
        <div className="auth-footer">
          <span>Signed in as {auth.email}</span>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
