# Step 20: Approval Gates System

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
- docs/CLI_COMMAND_SPEC.md
- docs/LOCAL_WEB_UI_SPEC.md
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

Implement Step 20: Approval Gates System.

## Background

The docs define 6 required approval gates (Workflow §9.1):
1. **Gate 1: Requirement Approval** — Before technical planning, user approves clarified requirement
2. **Gate 2: Plan Approval** — Before implementation, user approves design + tasks + tests
3. **Gate 3: Code Generation Approval** — Before running AI coding CLI
4. **Gate 4: Risky File Approval** — If AI modifies sensitive files
5. **Gate 5: External Update Approval** — Before Jira/Slack/GitHub updates
6. **Gate 6: Rollback Approval** — Before rollback

This step implements Gates 1 and 2 (requirement and plan approval) with the supporting infrastructure. The remaining gates come in later steps when code generation and integrations are built.

The approval system must work in both CLI and web UI. In CLI, the workflow should pause and print instructions. In web UI, it should show an approval modal.

## Tasks

### 1. Add approval gates to shared types

In `packages/shared/src/types/domain.ts`:

```typescript
export type ApprovalGate =
  | "REQUIREMENT"
  | "PLAN"
  | "CODE_GENERATION"
  | "RISKY_FILE"
  | "EXTERNAL_UPDATE"
  | "ROLLBACK";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Approval {
  gate: ApprovalGate;
  runId: string;
  status: ApprovalStatus;
  approvedAt?: string;
  approvedBy?: string;
  note?: string;
}
```

### 2. Add approvals table to SQLite schema

In `packages/storage/src/schema.ts`:

```sql
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  gate TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);
```

### 3. Create approval repository

Create `packages/storage/src/repositories/approvalRepository.ts`:

```typescript
export interface CreateApprovalInput {
  id: string;
  runId: string;
  gate: ApprovalGate;
  status: ApprovalStatus;
  note?: string;
}

// Methods:
// - create(input): Create a new approval record
// - findByRunId(runId): Get all approvals for a run
// - findByRunIdAndGate(runId, gate): Get specific gate approval
// - updateStatus(id, status, note): Approve or reject
// - isApproved(runId, gate): Check if gate is approved
```

### 4. Export from storage

Update `packages/storage/src/index.ts`:
```typescript
export { createApprovalRepository } from "./repositories/approvalRepository.js";
export type { ApprovalRecord, CreateApprovalInput } from "./repositories/approvalRepository.js";
```

### 5. Add approval types to shared exports

Update `packages/shared/src/index.ts`:
```typescript
export type { ApprovalGate, ApprovalStatus, Approval } from "./types/domain.js";
```

### 6. Update workflow to support gates

Modify `packages/core/src/workflows/docsOnlyWorkflow.ts` (and the subsequent assisted workflow):

Add a gate checking mechanism. The workflow should:
1. After generating requirement artifacts, create a REQUIREMENT approval gate with status PENDING
2. Return control to the caller with a `pendingGate` status
3. Only proceed when the caller confirms the gate is approved

Interface:

```typescript
export interface WorkflowGate {
  gate: ApprovalGate;
  status: ApprovalStatus;
  summary: string; // What the user needs to review
  artifacts: string[]; // Artifacts to review
}

export interface WorkflowResult {
  runId: string;
  status: string;
  artifacts: string[];
  pendingGate?: WorkflowGate; // Set when workflow is waiting
}
```

The workflow runner should:
- Generate artifacts up to the gate point
- Return with `pendingGate` set
- When called again with `approvedGate`, continue to the next stage

### 7. Add resume capability to runs

The runs table already has status. Add run states:
- `WAITING_FOR_REQUIREMENT_APPROVAL`
- `WAITING_FOR_PLAN_APPROVAL`

Update `packages/shared/src/types/domain.ts`:
```typescript
export type RunStatus =
  | "CREATED"
  | "SPEC_GENERATED"
  | "WAITING_FOR_REQUIREMENT_APPROVAL"
  | "PLAN_GENERATED"
  | "WAITING_FOR_PLAN_APPROVAL"
  | "REPORT_GENERATED"
  | "FAILED"
  | "CANCELLED";
```

### 8. Implement a gate-aware workflow runner

Create `packages/core/src/workflows/workflowRunner.ts`:

```typescript
export async function runWorkflowWithGates(
  input: WorkflowInput,
): Promise<WorkflowResult> {
  // Phase 1: Run BA agent → generate requirement artifacts
  // Create REQUIREMENT approval gate
  // Return with pendingGate

  // On next call (after approval):
  // Phase 2: Run Architect, PM, QA agents → generate plan artifacts
  // Create PLAN approval gate
  // Return with pendingGate

  // On next call (after approval):
  // Phase 3: Run Reporter → generate final report
  // Return completed
}
```

### 9. Implement CLI approve/reject commands

Create `apps/cli/src/commands/approve.ts`:

```bash
codeclaw approve <runId> --gate REQUIREMENT --note "Looks good"
codeclaw reject <runId> --gate PLAN --reason "Design too complex"
```

Options:
- `--gate <gate>` — Which gate to approve/reject
- `--note <note>` — Approval note
- `--reason <reason>` — Rejection reason (for reject)

Create `apps/cli/src/commands/reject.ts`:
Same options as approve but sets status to REJECTED.

Register in CLI entry point:
```typescript
import { approveCommand } from "./commands/approve.js";
import { rejectCommand } from "./commands/reject.js";

program
  .command("approve")
  .argument("<runId>")
  .option("--gate <gate>", "Gate to approve")
  .option("--note <note>", "Approval note")
  .action(approveCommand);

program
  .command("reject")
  .argument("<runId>")
  .option("--gate <gate>", "Gate to reject")
  .option("--reason <reason>", "Rejection reason")
  .action(rejectCommand);
```

### 10. Update run command for gate-aware flow

Update `apps/cli/src/commands/run.ts`:
- After generating requirement artifacts, if approval gates are enabled (config setting), print:
  ```
  ⏸️ Requirement approval needed.
  Run: codeclaw approve <runId> --gate REQUIREMENT
  Or: codeclaw ui to approve in browser
  ```
- After user approves, continue to plan phase
- After plan phase, if plan approval is enabled, print similar message
- Support `--approve` flag to auto-approve non-risky gates

### 11. Add run stage resume command

Create `apps/cli/src/commands/resume.ts`:

```bash
codeclaw resume <runId>
```

This checks the current run status and pending gates, then continues the workflow.

### 12. Add cancel command

Create `apps/cli/src/commands/cancel.ts`:

```bash
codeclaw cancel <runId> --reason "Requirement changed"
```

Sets run status to CANCELLED.

### 13. Add approval UI in web UI

Update `apps/local-web/src/pages/RunDetail.tsx`:

Add an approval section that shows:
- Approval gate status (Pending, Approved, Rejected)
- Artifacts to review
- Approve / Reject buttons
- Note input field
- Only shown when workflow is waiting

Use the API endpoints:
- `GET /api/runs/:id/approvals` — List gates
- `POST /api/runs/:id/approvals` — Approve or reject

### 14. Add approval API routes

Update `packages/server/src/routes/runs.routes.ts`:

```typescript
// GET /api/runs/:id/approvals
// POST /api/runs/:id/approvals  { gate, status, note }
```

### 15. Add tests

- Test approval repository CRUD
- Test gate-aware workflow phases
- Test CLI approve/reject commands
- Test API approve/reject endpoints
- Test that workflow blocks on pending gate
- Test that workflow resumes after approval

## Acceptance Criteria

- `codeclaw run "..."` with gates enabled pauses after requirement generation
- User can approve via `codeclaw approve <runId> --gate REQUIREMENT`
- Workflow resumes and completes after approval
- `codeclaw reject` sets gate to REJECTED, run to CANCELLED
- Web UI shows approval status and buttons
- Run status reflects waiting state
- Gates are optional — if disabled in config, workflow runs straight through
- All existing tests pass

## Files to Create

- `packages/storage/src/repositories/approvalRepository.ts`
- `packages/core/src/workflows/workflowRunner.ts`
- `apps/cli/src/commands/approve.ts`
- `apps/cli/src/commands/reject.ts`
- `apps/cli/src/commands/resume.ts`
- `apps/cli/src/commands/cancel.ts`

## Files to Modify

- `packages/shared/src/types/domain.ts`
- `packages/shared/src/index.ts`
- `packages/storage/src/schema.ts`
- `packages/storage/src/index.ts`
- `packages/core/src/workflows/docsOnlyWorkflow.ts`
- `packages/core/src/index.ts`
- `apps/cli/src/commands/run.ts`
- `apps/cli/src/index.ts`
- `apps/local-web/src/pages/RunDetail.tsx`
- `apps/local-web/src/lib/api.ts`
- `apps/local-web/src/lib/types.ts`
- `packages/server/src/routes/runs.routes.ts`

## Rules

Implement only this step.
Do not implement future roadmap steps.
Implement Gates 1 and 2 only (Requirement, Plan). Other gates come later.
Do not add cloud backend.
Do not add login.
Do not add billing.
Do not add desktop app.
Do not add Jira/Slack/GitHub integration.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
