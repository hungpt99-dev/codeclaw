# Step 19: Assisted Workflow Mode — Implementation Prompt Generator

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
- docs/WORKFLOW_DESIGN.md
- docs/PRD.md
- docs/LOCAL_WEB_UI_SPEC.md

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
- Do not add cloud backend.
- Do not add login.
- Do not add billing.
- Do not add desktop app.
- Do not make Jira, Slack, or GitHub required.
- Jira, Slack, and GitHub must remain optional advanced integrations.
- The app must work without Jira, Slack, or GitHub config.
- Do not bypass quality checks.
- Do not weaken scripts just to check passes.
- Keep changes minimal and focused.
- Prefer updating existing files over creating duplicates.
- At the end, summarize docs read, changed files, and commands run.

---

Implement Step 19: Assisted Workflow Mode — Implementation Prompt Generator.

## Background

The docs define "Assisted Mode" as a core workflow mode (PRD §12.2, Workflow §5.2). In this mode, after generating all docs (requirement, design, tasks, test matrix), the product generates a comprehensive implementation prompt that the user can copy into their preferred AI coding tool (Claude Code, Codex CLI, Gemini CLI, Aider).

This is the first demonstrable end-to-end user value: "Give me a rough requirement, I'll give you a complete prompt for your coding agent."

The docs also define a Developer Agent role (Workflow §4.6, PRD §11.7) that is responsible for generating implementation prompts.

This step does NOT run AI coding agents automatically. That comes in a later step.

## Tasks

### 1. Create Developer Agent prompt template

Create `templates/prompts/developer-agent.md`:

```
# Developer Agent

You are a Developer agent. Your role is to generate a comprehensive implementation prompt for an AI coding agent based on the approved requirement, design, tasks, and test matrix.

## Input

**Raw Requirement**:
{{rawRequirement}}

**Clarified Requirement**:
{{clarifiedRequirement}}

**Business Rules**:
{{businessRules}}

**Acceptance Criteria**:
{{acceptanceCriteria}}

**Technical Design**:
{{technicalDesign}}

**API Design**:
{{apiDesign}}

**Database Design**:
{{dbDesign}}

**Task Breakdown**:
{{taskBreakdown}}

**Test Matrix**:
{{testMatrix}}

## Instructions

1. Synthesize all inputs into a single, coherent implementation prompt.
2. Structure the prompt for the target AI coding agent format.
3. Include: goal, context, constraints, affected areas, coding rules, expected tests, expected output, forbidden actions.
4. Do not include sensitive information or secrets.
5. The prompt should be specific enough that a coding agent can implement without asking clarifying questions.

## Output Format

# Implementation Prompt

## Goal
[Clear statement of what to implement]

## Context
[Project context, technology stack, existing patterns]

## Requirements
[Numbered list of specific requirements to fulfill]

## Acceptance Criteria
[Checklist of acceptance criteria that must be met]

## Technical Design
[Key design decisions, architecture patterns to follow]

## API Design
[API endpoints if applicable]

## Database Changes
[Database changes if applicable]

## Tasks
[Implementation tasks in order]

## Test Expectations
[Test cases that must pass]

## Constraints
[Safety rules, forbidden actions, file protection rules]

## Expected Output
[What files will be created or modified]
```

Also copy this template during `aiteam init` by updating `apps/cli/src/commands/init.ts` to include `developer-agent.md` in the template copy list.

### 2. Create Developer Agent implementation

Create `packages/core/src/agents/developerAgent.ts`:

```typescript
export interface DeveloperAgentInput {
  requirement: string;
  clarifiedRequirement: string;
  businessRules: string;
  acceptanceCriteria: string;
  technicalDesign: string;
  apiDesign: string;
  dbDesign: string;
  taskBreakdownMd: string;
  testMatrixMd: string;
  targetAgent?: "claude-code" | "codex" | "gemini" | "aider" | "generic";
}

export interface DeveloperAgentOutput {
  implementationPrompt: string;
}
```

Implementation notes:
- Load `developer-agent.md` template
- If LLM is configured, send all artifacts as context to generate a tailored prompt
- If LLM is disabled, use a deterministic template that assembles all artifacts into a structured markdown document
- The deterministic version should still be useful — it combines all prior artifacts under clear headings

### 3. Create assistedWorkflow

Create `packages/core/src/workflows/assistedWorkflow.ts`:

```
Flow:
1. Run all docs agents (BA → Architect → PM → QA)
2. Run Developer Agent to generate implementation prompt
3. Run Reporter Agent for final report
4. Generate all standard artifacts plus implementation-prompt.md
```

Structure it like `docsOnlyWorkflow.ts` but add the Developer Agent step.

### 4. Export assisted workflow from core

Update `packages/core/src/index.ts`:
```typescript
export { runAssistedWorkflow } from "./workflows/assistedWorkflow.js";
export { runDeveloperAgent } from "./agents/developerAgent.js";
export type { DeveloperAgentInput, DeveloperAgentOutput } from "./agents/developerAgent.js";
export type { AssistedWorkflowInput, AssistedWorkflowOutput } from "./worksflows/assistedWorkflow.js";
```

### 5. Wire assisted mode in CLI

Update `apps/cli/src/commands/run.ts`:
- Read `--mode assisted`
- Call `runAssistedWorkflow` when mode is "assisted"
- Update `RunCliOptions` to include `mode?: string`
- Add `--mode` option to the run command

### 6. Add implementation prompt to artifact paths

Update `packages/core/src/artifacts/artifactWriter.ts`:
- Add `implementationDir: string` to `ArtifactPaths`
- Add `implementationDir` to `createArtifactDirs`
- Keep backward compatibility by making it optional or always creating it

### 7. Add implementation prompt tab in web UI

Update `apps/local-web/src/pages/RunDetail.tsx`:
- Add "Implementation" tab after "Tests" tab
- Show implementation prompt content in a Markdown viewer
- Add "Copy to Clipboard" button with feedback
- Add agent format selector dropdown (Claude Code, Codex, Gemini, Aider, Generic)

The tab should only appear when implementation prompt artifacts exist.

### 8. Add run mode persistence

The mode ("docs-only" or "assisted") must be persisted in the runs table and shown in:
- `aiteam list` output
- `aiteam show` output
- Web UI Run Detail header
- Web UI Runs table

### 9. Update web UI NewRequirement page

Update `apps/local-web/src/pages/NewRequirement.tsx`:
- Enable the mode dropdown (currently disabled, hardcoded to "docs-only")
- Options: "docs-only", "assisted"
- Add agent selector for assisted mode

### 10. Add tests

- Test Developer Agent deterministic output structure
- Test assistedWorkflow generates all expected artifacts
- Test assistedWorkflow includes implementation-prompt.md
- Test mode routing in CLI

## Acceptance Criteria

- `aiteam run "..." --mode assisted` generates implementation-prompt.md
- Implementation prompt contains requirement, design, tasks, tests, constraints in a structured format
- Web UI shows "Implementation" tab with prompt content and copy button
- Web UI mode dropdown works with "docs-only" and "assisted"
- Run mode is persisted and displayed correctly
- All existing docs-only tests still pass
- `pnpm build`, `pnpm test`, `pnpm typecheck` pass

## Files to Create

- `templates/prompts/developer-agent.md`
- `packages/core/src/agents/developerAgent.ts`
- `packages/core/src/worksflows/assistedWorkflow.ts`

## Files to Modify

- `packages/core/src/index.ts`
- `packages/core/src/artifacts/artifactWriter.ts`
- `apps/cli/src/commands/run.ts`
- `apps/cli/src/index.ts`
- `apps/local-web/src/pages/RunDetail.tsx`
- `apps/local-web/src/pages/NewRequirement.tsx`
- `apps/local-web/src/lib/types.ts`
- `apps/local-web/src/lib/api.ts`

## Rules

Implement only this step.
Do not implement future roadmap steps.
Do not run AI coding agents automatically.
The assisted mode generates prompts only. Users copy and paste manually.
Do not add cloud backend.
Do not add login.
Do not add billing.
Do not add desktop app.
Do not add Jira/Slack/GitHub integration.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
