# Step 08: Local Server API

Implement Step 08: Local Server API.

Work mainly in apps/local-server.

Use Fastify.

Routes:

- GET /api/health
- GET /api/settings
- PUT /api/settings
- GET /api/runs
- GET /api/runs/:id
- POST /api/runs
- GET /api/runs/:id/artifacts
- GET /api/runs/:id/artifacts/:artifactId
- GET /api/prompts
- GET /api/prompts/:name
- PUT /api/prompts/:name

Rules:

- POST /api/runs only supports docs-only mode.
- POST /api/runs calls docsOnlyWorkflow.
- Run and artifact metadata are saved to SQLite.
- Artifact content route reads local file content.
- Prompt routes must reject path traversal.
- Prompt routes only allow files inside .ai-team/prompts.
- Bind to localhost by default.
- No auth needed because local-only.

Acceptance criteria:
server starts.
health route works.
can create run through API.
can list runs.
can read artifact content.
can list/read/update prompt templates.
path traversal is blocked.

## Rules

Implement only this step.
Do not implement future roadmap steps.
Do not add real AI calls.
Do not add cloud backend.
Do not add login.
Do not add billing.
Do not add desktop app.
Do not add Jira/Slack/GitHub integration unless this step explicitly asks.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
