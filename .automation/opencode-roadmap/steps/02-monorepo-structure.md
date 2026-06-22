# Step 02: Monorepo Structure

Implement Step 02: Monorepo Structure.

Create or complete the pnpm workspace structure for Local AI Software Team.

Required structure:

```
apps/
  cli/
  local-server/
  local-web/

packages/
  shared/
  storage/
  core/

templates/
  prompts/
```

Each package/app needs:

- package.json
- tsconfig.json
- basic src files
- build script
- typecheck script
- lint script
- test script

Package names:

- @aiteam/cli
- @aiteam/local-server
- @aiteam/local-web
- @aiteam/shared
- @aiteam/storage
- @aiteam/core

CLI:
Expose binary name: aiteam
Create placeholder commands only:

- init
- doctor
- ui

Local server:
Use Fastify.
Add GET /api/health.

Local web:
Use React + Vite + TypeScript.
Add App layout.
Add Sidebar.
Add placeholder pages:

- Dashboard
- New Requirement
- Runs
- Run Detail
- Settings
- Prompt Templates

Do not implement product workflow yet.
Do not implement real AI calls.
Do not implement integrations.

Acceptance criteria:
pnpm install works.
pnpm build works.
pnpm typecheck works.
pnpm lint works.
pnpm test works.
CLI package exposes aiteam binary.
local-server has health route.
local-web starts with Vite.

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
