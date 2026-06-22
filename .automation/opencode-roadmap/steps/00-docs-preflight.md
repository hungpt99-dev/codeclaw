# Step 00: Docs Preflight

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

- docs/ (inspect all docs)
- docs/AI_AGENT_RULES.md
- docs/ARCHITECTURE.md

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

## Step Objective: Documentation Preflight

This step is documentation-only.

It must not implement product features.

### Tasks

1. Inspect the `docs/` folder.
2. Check whether these Markdown source-of-truth docs exist:
   - docs/DOCS_INDEX.md
   - docs/PRD.md
   - docs/TECHNICAL_DESIGN.md
   - docs/WORKFLOW_DESIGN.md
   - docs/CLI_COMMAND_SPEC.md
   - docs/LOCAL_WEB_UI_SPEC.md
   - docs/ROADMAP.md

3. If some Markdown files do not exist but similar PDF files exist, create lightweight Markdown source-of-truth summaries based on:
   - existing Markdown docs
   - PDF filenames
   - known product context from the prompt

4. Do not do heavy PDF parsing unless already available.
5. Do not modify source code.
6. Update `docs/DOCS_INDEX.md`.
7. Update `docs/AI_AGENT_RULES.md`.

### docs/DOCS_INDEX.md must include:

- Source-of-truth docs
- Recommended reading order for coding agents
- Which PDFs are exported/reference documents
- MVP boundaries
- Advanced features that must remain optional
- Clear statement that Jira/Slack/GitHub are optional
- Clear statement that the app must work without integration config
- Clear statement that every OpenCode step must reload docs
- Clear statement that agents must not rely on previous session memory

### Important architecture rules to include:

- CLI is the main engine.
- Local Web UI is only a local dashboard.
- Local Fastify server runs on localhost.
- Storage is local under .ai-team/.
- No desktop app.
- No cloud backend.
- No login.
- No billing in MVP.
- No real AI calls in MVP.
- Jira, Slack, and GitHub integrations are optional advanced features.
- The app must work normally without Jira, Slack, or GitHub config.
- Docs-only workflow is the MVP.
- Do not implement future roadmap steps early.

### Acceptance Criteria

- docs/DOCS_INDEX.md exists and is up to date.
- docs/AI_AGENT_RULES.md includes documentation loading rules.
- No source code modified.
- No product features implemented.

### Commit Message

docs: add coding-agent documentation source of truth
