# Step 22: Traceability Matrix Engine

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

- docs/PRD.md
- docs/TECHNICAL_DESIGN.md
- docs/WORKFLOW_DESIGN.md
- docs/CLI_COMMAND_SPEC.md
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
- Do not weaken scripts just to pass checks.
- Do not remove tests just to make checks pass.
- Keep changes minimal and focused.
- Prefer updating existing files over creating duplicates.
- At the end, summarize docs read, changed files, and commands run.

---

Implement Step 22: Traceability Matrix Engine.

## Background

The docs repeatedly call traceability a "key differentiator" (PRD §11.11, §23; Workflow §17; Technical §23). The concept is:
- Before code: Requirement → Acceptance Criteria → Task → Test Case
- After code: + Code Files → Test Result

Currently only a basic static traceability table exists in the final report template. This step builds a proper traceability engine that:
1. Parses artifact content to extract requirement IDs (REQ-001), acceptance criteria IDs (AC-001), task IDs (TASK-001), test case IDs (TC-001)
2. Maps them into a structured matrix
3. Stores in SQLite for querying
4. Shows in web UI as an interactive table
5. Exports as JSON and Markdown

## Tasks

### 1. Add traceability types to shared

In `packages/shared/src/types/domain.ts`:

```typescript
export type CoverageStatus = "COVERED" | "PARTIAL" | "NOT_COVERED" | "UNKNOWN";

export interface TraceabilityItem {
  requirementId: string;
  requirementText: string;
  acceptanceCriteriaIds: string[];
  taskIds: string[];
  codeFiles: string[];
  testCases: string[];
  testResults: string[];
  status: CoverageStatus;
}

export interface TraceabilityMatrix {
  runId: string;
  items: TraceabilityItem[];
  generatedAt: string;
  summary: {
    total: number;
    covered: number;
    partial: number;
    notCovered: number;
  };
}
```

### 2. Add traceability_items table to SQLite

In `packages/storage/src/schema.ts`:

```sql
CREATE TABLE IF NOT EXISTS traceability_items (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  requirement_id TEXT NOT NULL,
  requirement_text TEXT NOT NULL,
  acceptance_criteria_ids TEXT NOT NULL,
  task_ids TEXT NOT NULL,
  code_files TEXT NOT NULL,
  test_cases TEXT NOT NULL,
  test_results TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);
```

### 3. Create traceability repository

Create `packages/storage/src/repositories/traceabilityRepository.ts`:

```typescript
export interface CreateTraceabilityItemInput {
  id: string;
  runId: string;
  requirementId: string;
  requirementText: string;
  acceptanceCriteriaIds: string[];
  taskIds: string[];
  codeFiles: string[];
  testCases: string[];
  testResults: string[];
  status: CoverageStatus;
}

// Methods:
// - create(input)
// - findByRunId(runId): TraceabilityItem[]
// - findByRequirementId(runId, reqId): TraceabilityItem | undefined
// - deleteByRunId(runId): void
// - getSummary(runId): { total, covered, partial, notCovered }
```

### 4. Create traceability parser

Create `packages/core/src/traceability/traceabilityParser.ts`:

This module parses artifact markdown content to extract structured IDs and relationships.

```typescript
export function parseRequirementId(content: string): { id: string; text: string } | null

export function parseAcceptanceCriteria(content: string): Array<{ id: string; text: string }>

export function parseTaskBreakdown(content: string): Array<{ id: string; title: string }>

export function parseTestMatrix(content: string): Array<{ id: string; scenario: string }>
```

Parsing strategy:
- Look for markdown patterns like `| REQ-001 | ... |` in tables
- Look for `**ID**: REQ-001` patterns
- Look for numbered lists with IDs
- Use regex extraction for known patterns

### 5. Create traceability engine

Create `packages/core/src/traceability/traceabilityEngine.ts`:

```typescript
export async function generateTraceability(
  runId: string,
  artifactPaths: ArtifactPaths,
): Promise<TraceabilityMatrix>
```

Logic:
1. Read all artifact files from the run directory
2. Parse requirement artifacts → extract requirement IDs and text
3. Parse acceptance criteria → extract AC IDs
4. Parse task breakdown → extract task IDs
5. Parse test matrix → extract test case IDs
6. Build traceability items: for each requirement, list its ACs, tasks, tests
7. Determine coverage status:
   - COVERED: has tasks AND tests mapped
   - PARTIAL: has tasks but missing tests (or vice versa)
   - NOT_COVERED: no tasks and no tests
8. Return the matrix

### 6. Export from core

Update `packages/core/src/index.ts`:
```typescript
export { generateTraceability } from "./traceability/traceabilityEngine.js";
export type { TraceabilityMatrix, TraceabilityItem, CoverageStatus } from "@aiteam/shared";
```

### 7. Update workflow to generate traceability before report

Update the reporter agent or workflow:
- After all agents complete but before final report, run `generateTraceability`
- Save traceability as `report/traceability.md` and `report/traceability.json`
- Pass traceability matrix to reporter agent for inclusion in final report

### 8. Add aiteam trace CLI command

Create `apps/cli/src/commands/trace.ts`:

```bash
aiteam trace --run <runId>
aiteam trace --run <runId> --format json
aiteam trace --run <runId> --regenerate
```

Options:
- `--run <runId>` — Required
- `--format <format>` — Output format: markdown, json, all (default: all)
- `--regenerate` — Regenerate traceability

Register in CLI entry point.

### 9. Add traceability artifact paths

Update `packages/core/src/artifacts/artifactWriter.ts`:

Add to `ArtifactPaths`:
```typescript
traceabilityMd: string;
traceabilityJson: string;
```

Create these directories and paths.

### 10. Show traceability in web UI

Update `apps/local-web/src/pages/RunDetail.tsx`:

Add "Traceability" tab after "Tests" tab showing:
- Summary cards: Total items, Covered, Partial, Not Covered
- Table with columns: Requirement, AC, Tasks, Code Files, Tests, Status
- Color-coded status badges (green = Covered, yellow = Partial, red = Not Covered)
- Export buttons (Markdown, JSON)

The tab should only appear when traceability artifacts exist.

### 11. Update final report template

Update `packages/core/src/agents/reporterAgent.ts`:
- Include traceability summary in final report
- Show coverage percentages
- List uncovered requirements

### 12. Add traceability API routes

Update `packages/server/src/routes/runs.routes.ts`:

```typescript
// GET /api/runs/:id/traceability — Get traceability matrix
// POST /api/runs/:id/traceability — Generate/regenerate traceability
```

### 13. Add tests

- Test traceability parser with sample markdown content
- Test traceability engine with mock artifacts
- Test coverage status calculation
- Test edge cases: no artifacts, missing IDs, duplicate IDs
- Test CLI command

## Acceptance Criteria

- Traceability matrix is generated after workflow completion
- Requirements, ACs, tasks, and test cases are correctly parsed from artifacts
- Coverage status is correctly calculated
- `aiteam trace --run <runId>` generates and displays traceability
- Web UI shows Traceability tab with interactive table
- Traceability is exported as both markdown and JSON
- Final report includes traceability summary
- All existing tests pass

## Files to Create

- `packages/core/src/traceability/traceabilityEngine.ts`
- `packages/core/src/traceability/traceabilityParser.ts`
- `packages/storage/src/repositories/traceabilityRepository.ts`
- `apps/cli/src/commands/trace.ts`
- `packages/core/src/traceability/index.ts`

## Files to Modify

- `packages/shared/src/types/domain.ts`
- `packages/shared/src/index.ts`
- `packages/storage/src/schema.ts`
- `packages/storage/src/index.ts`
- `packages/core/src/index.ts`
- `packages/core/src/artifacts/artifactWriter.ts`
- `packages/core/src/agents/reporterAgent.ts`
- `packages/core/src/workflows/docsOnlyWorkflow.ts`
- `apps/cli/src/index.ts`
- `apps/local-web/src/pages/RunDetail.tsx`
- `apps/local-web/src/lib/types.ts`
- `apps/local-web/src/lib/api.ts`
- `packages/server/src/routes/runs.routes.ts`

## Rules

Implement only this step.
Do not implement future roadmap steps.
Traceability must work without code changes (before code phase).
Do not add cloud backend.
Do not add login.
Do not add billing.
Do not add desktop app.
Do not add Jira/Slack/GitHub integration.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
