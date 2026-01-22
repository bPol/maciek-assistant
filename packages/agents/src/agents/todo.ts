import type { Agent, AgentContext } from "../index.js";

type TodoTask = {
  id: string;
  name: string;
  status?: string;
  dueAt?: string;
  priority?: string;
  url?: string;
};

type TodoProvider = {
  listTasks: (ctx: AgentContext) => Promise<TodoTask[]>;
};

const isTodoProvider = (value: unknown): value is TodoProvider => {
  if (!value || typeof value !== "object") {
    return false;
  }
  return typeof (value as TodoProvider).listTasks === "function";
};

const resolveProvider = (ctx: AgentContext): TodoProvider | null => {
  const memory = ctx.memory as Record<string, unknown>;
  if (isTodoProvider(memory.clickupProvider)) {
    return memory.clickupProvider;
  }
  return null;
};

const summarizeTasks = (tasks: TodoTask[], now: number) => {
  const overdue = tasks.filter((task) => {
    if (!task.dueAt) {
      return false;
    }
    const due = Date.parse(task.dueAt);
    return Number.isFinite(due) && due < now;
  });

  const withDueDate = tasks.filter((task) => task.dueAt);
  const withoutDueDate = tasks.length - withDueDate.length;
  return {
    total: tasks.length,
    overdue: overdue.length,
    withoutDueDate
  };
};

const proposeHelp = (tasks: TodoTask[], now: number): string[] => {
  const suggestions: string[] = [];
  const overdue = tasks.filter((task) => {
    if (!task.dueAt) {
      return false;
    }
    const due = Date.parse(task.dueAt);
    return Number.isFinite(due) && due < now;
  });

  if (overdue.length > 0) {
    suggestions.push(
      `Triage ${overdue.length} overdue task${overdue.length === 1 ? "" : "s"} and reset due dates.`
    );
  }

  const noDueDate = tasks.filter((task) => !task.dueAt);
  if (noDueDate.length > 0) {
    suggestions.push(
      `Add due dates to ${noDueDate.length} task${noDueDate.length === 1 ? "" : "s"} to reduce drift.`
    );
  }

  const highPriority = tasks.filter(
    (task) => task.priority && /high|urgent|p1/i.test(task.priority)
  );
  if (highPriority.length > 0) {
    suggestions.push(
      `Focus on ${highPriority.length} high-priority task${highPriority.length === 1 ? "" : "s"} today.`
    );
  }

  if (suggestions.length === 0) {
    suggestions.push("Looks good. Want me to group tasks by project or due date?");
  }

  return suggestions;
};

const formatSummary = (tasks: TodoTask[], now: number) => {
  const summary = summarizeTasks(tasks, now);
  const suggestions = proposeHelp(tasks, now);
  return [
    `Summary: ${summary.total} total, ${summary.overdue} overdue, ${summary.withoutDueDate} without due dates.`,
    `Proactive help: ${suggestions.join(" ")}`
  ].join("\n");
};

const setupReply = () =>
  [
    "I can connect to ClickUp once a provider is wired in.",
    "Add a ClickUp provider to AgentContext.memory as `clickupProvider`.",
    "That provider should expose `listTasks(ctx)` and return task objects with id/name/status/dueAt/priority/url."
  ].join("\n");

export const createTodoAgent = (): Agent => ({
  id: "todo",
  description: "Connects to ClickUp MCP, summarizes tasks, and proposes help.",
  canHandle: (ctx) => /todo|task|clickup|action items?|backlog/i.test(ctx.input),
  handle: async (ctx) => {
    const provider = resolveProvider(ctx);
    if (!provider) {
      return { reply: setupReply(), metadata: { connected: false } };
    }

    try {
      const tasks = await provider.listTasks(ctx);
      const now = Date.now();
      return {
        reply: formatSummary(tasks, now),
        metadata: { connected: true, taskCount: tasks.length }
      };
    } catch (error) {
      return {
        reply: "I could not reach ClickUp. Check the MCP provider configuration.",
        metadata: { connected: false, error: String(error) }
      };
    }
  }
});
