# Step 07: CLI MVP

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

- docs/CLI_COMMAND_SPEC.md
- docs/ARCHITECTURE.md
- docs/TECHNICAL_DESIGN.md

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

Implement Step 07: CLI MVP.

Work mainly in apps/cli.

Use Commander.js.

Implement commands:

- aiteam init
- aiteam doctor
- aiteam run "raw requirement"
- aiteam list
- aiteam show <runId>
- aiteam ui

aiteam init:

1. Create .ai-team.
2. Create .ai-team/config.json.
3. Create .ai-team/database.sqlite.
4. Initialize SQLite schema.
5. Create .ai-team/prompts.
6. Copy templates.
7. Create .ai-team/runs.

Options:

- --force
- --type <type>
- --output-language <language>

Do not overwrite unless --force.

aiteam doctor checks:

- .ai-team exists
- config valid
- SQLite opens
- prompt templates exist
- Node.js available
- Git available

aiteam run:

Only docs-only mode for now.

1. Validate .ai-team.
2. Load config.
3. Create run ID.
4. Save run metadata to SQLite.
5. Execute docsOnlyWorkflow.
6. Save artifact metadata.
7. Update status to REPORT_GENERATED.
8. Print artifact list.

Options:

- --title
- --output-language
- --json

aiteam list:

Show recent runs.

aiteam show <runId>:

Show run metadata and artifact paths.

aiteam ui:

For now, start local server if available or print a clear message if dev server must be started separately.

Acceptance criteria:
aiteam init works.
aiteam doctor works.
aiteam run generates local docs.
aiteam list shows runs.
aiteam show displays run detail.
no real AI calls.
no source files outside .ai-team are modified by run.

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
