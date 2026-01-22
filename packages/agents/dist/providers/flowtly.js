export const createFlowtlyMcpProvider = (config) => {
    const getSnapshot = async (_ctx) => {
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
        const data = (await response.json());
        if (!data.output) {
            throw new Error(data.error ?? "Flowtly MCP returned no output");
        }
        return data.output;
    };
    return { getSnapshot };
};
//# sourceMappingURL=flowtly.js.map