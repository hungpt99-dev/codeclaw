# Step 05: Core Docs-only Workflow

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
Do not modify files outside .ai-team.

Artifact writer should create:

```
.ai-team/runs/<runId>/
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
