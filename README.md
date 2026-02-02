# maciek-assistant

Monorepo for a one-person assistant with multiple agents.

## Structure
- packages/agents: multi-agent core
- packages/console: CLI entrypoint
- packages/web: React UI

## Beginner vibecoding quickstart
If you are new to this repo, keep the loop tight: make a tiny change, run something, observe, repeat.

1) Install Node.js + npm.
2) Install deps once:
   - `npm install`
3) Build once (generates `dist/` folders):
   - `npm run build`
4) Try the CLI:
   - `node packages/console/dist/index.js "plan a week"`
5) Start the web UI + API together:
   - `npm run dev:all`

Where to change things:
- Agent logic: `packages/agents`
- API routes + wiring: `packages/api`
- Web UI: `packages/web`

## Quick start (fast path)
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

## E2E smoke tests (use these as the base checklist)
The local e2e script is the fastest way to validate end-to-end behavior. Treat it as the baseline
for what “works” when you change API routing or agent behavior.

1) Start the API (default `http://localhost:8080`):
   - `npm -w @maciek/api run dev`
2) Run the e2e script:
   - `npm run e2e:local`

If your API runs elsewhere, set `E2E_API_URL`.

## Deployment (GCP + GitHub Actions)
This repo ships a Cloud Run API service plus Firebase Hosting for the React UI.

### One-time GCP setup
- Create an Artifact Registry repo named `maciek-assistant` in `europe-west1`.
- Create a Cloud Run service named `maciek-assistant-api` (first deploy can be via CI).
- Configure Workload Identity Federation for GitHub Actions and add secrets:
  - `GCP_WIF_PROVIDER`
  - `GCP_WIF_SERVICE_ACCOUNT`

### GitHub repo variables (recommended)
- `FLOWTLY_MCP_URL`
- `FLOWTLY_WORKSPACE_ID`
- `CLICKUP_LIST_IDS`
- `CLICKUP_ASSIGNEE_ID`
- `CLICKUP_INCLUDE_CLOSED`
- `CLICKUP_DUE_DAYS`
- `CORS_ORIGIN`
- `VITE_API_URL`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_ALLOWED_EMAILS`

### GitHub repo secrets
- `FLOWTLY_MCP_API_KEY`
- `FLOWTLY_MCP_CLIENT_ID`
- `FLOWTLY_MCP_CLIENT_SECRET`
- `CLICKUP_API_TOKEN` (or `CLICKUP_API_CLIENT` if using a token in that slot)
- `CLICKUP_API_CLIENT_SECRET`
- `GEMINI_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT_MACIEK_ASSISTANT`

Workflows live in `.github/workflows/deploy-api.yml` and `.github/workflows/deploy-web.yml`.

## Local dev
- npm run dev

The console routes input to a default agent set defined in the agents package.
