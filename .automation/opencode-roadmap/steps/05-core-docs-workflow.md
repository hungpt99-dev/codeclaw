# Step 05: Core Docs-only Workflow

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

- docs/WORKFLOW_DESIGN.md
- docs/TECHNICAL_DESIGN.md
- docs/PRD.md

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

Implement Step 05: Core Docs-only Workflow.

Work mainly in packages/core.

Create:

- packages/core/src/artifacts/artifactWriter.ts
- packages/core/src/prompts/promptRenderer.ts
- packages/core/src/workflows/docsOnlyWorkflow.ts
- packages/core/src/agents/baAgent.ts
- packages/core/src/agents/architectAgent.ts
- packages/core/src/agents/pmAgent.ts
- packages/core/src/agents/qaAgent.ts
- packages/core/src/agents/reporterAgent.ts
- packages/core/src/index.ts

Important:
Do not call real AI.
Use deterministic placeholder generation based on raw requirement.
Do not modify files outside .codeclaw.

Artifact writer should create:

```
.codeclaw/runs/<runId>/
  input.md
  requirement/
  design/
  tasks/
  tests/
  report/
  logs/
```

docsOnlyWorkflow should generate:

```
requirement/
  clarified-requirement.md
  business-rules.md
  acceptance-criteria.md
  open-questions.md
  assumptions.md

design/
  technical-design.md
  api-design.md
  db-design.md

tasks/
  task-breakdown.md
  task-breakdown.json

tests/
  test-matrix.md
  test-matrix.json

report/
  final-report.md
```

Each file should have useful structured markdown or JSON.

Implement prompt renderer:

renderPrompt(template: string, context: Record<string, string>): string

Add tests for:
prompt renderer
artifact writer
docsOnlyWorkflow output count and paths

Acceptance criteria:
core package builds.
tests pass.
workflow creates all expected files.
no real AI calls.

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
