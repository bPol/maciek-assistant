# maciek-assistant

Monorepo for a one-person assistant with multiple agents.

## Structure
- packages/agents: multi-agent core
- packages/console: CLI entrypoint
- packages/web: React UI

## Quick start
- npm install
- npm run build
- node packages/console/dist/index.js "plan a week"

## ClickUp (todo agent)
The todo agent uses the ClickUp REST API and expects an OAuth access token.

Required env vars:
- `CLICKUP_API_TOKEN`: OAuth access token (not the client secret).
- `CLICKUP_LIST_IDS`: Comma-separated list IDs.

Optional env vars:
- `CLICKUP_ASSIGNEE_ID`
- `CLICKUP_INCLUDE_CLOSED` (`true` or `false`)
- `CLICKUP_DUE_DAYS` (number)

If you only have a ClickUp app client ID/secret, you still need to complete the OAuth flow to obtain an access token.

## Web UI
- npm run -w @maciek/web dev

## Local dev
- npm run dev

The console routes input to a default agent set defined in the agents package.
