export const createClickUpRestProvider = (config) => {
    const baseUrl = config.baseUrl ?? "https://api.clickup.com/api/v2";
    const listTasks = async (_ctx) => {
        const now = Date.now();
        const dueInMs = typeof config.dueInDays === "number"
            ? config.dueInDays * 24 * 60 * 60 * 1000
            : null;
        const queries = await Promise.all(config.listIds.map(async (listId) => {
            const params = new URLSearchParams();
            if (config.assigneeId) {
                params.set("assignees[]", config.assigneeId);
            }
            if (config.includeClosed !== undefined) {
                params.set("include_closed", String(config.includeClosed));
            }
            if (dueInMs !== null) {
                params.set("due_date_lt", String(now + dueInMs));
            }
            const url = `${baseUrl}/list/${listId}/task?${params.toString()}`;
            const response = await fetch(url, {
                headers: {
                    Authorization: config.apiToken,
                    "Content-Type": "application/json"
                }
            });
            if (!response.ok) {
                const body = await response.text();
                throw new Error(`ClickUp API error for list ${listId}: ${response.status} ${body}`);
            }
            const data = (await response.json());
            return data.tasks ?? [];
        }));
        return queries.flat().map((task) => ({
            id: task.id,
            name: task.name,
            status: task.status?.status,
            dueAt: task.due_date ? new Date(Number(task.due_date)).toISOString() : undefined,
            priority: task.priority?.priority ?? task.priority?.name,
            url: task.url
        }));
    };
    return { listTasks };
};
//# sourceMappingURL=clickup.js.map