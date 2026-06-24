# Step 02: Monorepo Structure

## Mandatory Documentation Context Rule

This `opencode run` is a fresh session.

Do not rely on memory from previous OpenCode runs.

Before writing or modifying code, read the required project documentation once for this session.

After you have read the docs once in this same session, you do not need to read them again unless:

- you modify documentation files,
- you discover documentation changed,
- you are unsure about the architecture,
- you are about to make a decision that may conflict with the docs.

If this is a separate `opencode run`, a retry run, or a fix attempt, read the docs again because it is a new session.

## Docs to Read Once Per Session

Read these docs if they exist:

- README.md
- docs/DOCS_INDEX.md
- docs/AI_AGENT_RULES.md
- docs/ARCHITECTURE.md
- docs/DEVELOPMENT.md
- docs/CODE_QUALITY.md
- docs/CONTRIBUTING.md
- docs/SECURITY.md

Step-specific docs:

- docs/ARCHITECTURE.md
- docs/TECHNICAL_DESIGN.md
- docs/ROADMAP.md

Also inspect the current repository structure:

- package.json
- pnpm-workspace.yaml
- tsconfig.base.json
- apps/
- packages/
- templates/
- .automation/opencode-roadmap/

If PDF versions exist under docs/, treat them as exported/reference documents.
Prefer Markdown files as source of truth when available.
Do not read PDF files directly if equivalent Markdown files already exist.

## Session Docs Checklist

At the beginning of this session, create an internal checklist:

- [ ] Docs loaded
- [ ] Repo structure inspected
- [ ] Step objective understood
- [ ] Files to modify identified

After docs are loaded once, mark `Docs loaded` as done in your own working notes.
Do not create a physical file for this checklist unless needed.
This checklist is for the current OpenCode session only.

## Pre-Code Summary

Before coding, summarize:

1. Docs read in this session
2. Existing architecture
3. Current step objective
4. Existing files relevant to this step
5. Files you plan to modify

Only then implement the step.

## Common Implementation Rules

- Implement only this step.
- Read required docs once at the start of this OpenCode session.
- Do not rely on memory from previous OpenCode runs.
- Do not reread the same docs repeatedly within the same session unless docs changed or you are unsure.
- Inspect current repo structure before changing files.
- Do not implement future roadmap steps.
- Do not add real AI calls.
- Do not add cloud backend.
- Do not add login.
- Do not add billing.
- Do not add desktop app.
- Do not make Jira, Slack, or GitHub required.
- Jira, Slack, and GitHub must remain optional advanced integrations.
- The app must work without Jira, Slack, or GitHub config.
- Do not bypass quality checks.
- Do not weaken scripts just to pass checks.
- Do not remove tests just to make checks pass.
- Keep changes minimal and focused.
- Prefer updating existing files over creating duplicates.
- At the end, summarize docs read, changed files, and commands run.

---

Implement Step 02: Monorepo Structure.

Create or complete the pnpm workspace structure for CodeClaw.

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

- @codeclaw/cli
- @codeclaw/local-server
- @codeclaw/local-web
- @codeclaw/shared
- @codeclaw/storage
- @codeclaw/core

CLI:
Expose binary name: codeclaw
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
CLI package exposes codeclaw binary.
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
