# Step 51: Persistent Step-Level Workflow Execution Status

## Status

Planned

## Priority

P1

## Product Goal

Make CodeClaw workflows reliable, observable, and resumable. Users should know exactly which steps completed, which step is running, which step failed, and be able to resume or retry from any step after a cancellation or failure. This transforms CodeClaw from a fire-and-forget script into a dependable workflow engine that survives process restarts.

## Problem

CodeClaw currently has no persistent step-level execution tracking. When a workflow runs:

1. The `workflowEmitter` fires in-memory events that are lost on process restart.
2. The database stores only a single `run.status` field (e.g. `CODE_GENERATED`, `REPORT_GENERATED`, `FAILED`).
3. If a workflow is interrupted mid-execution, there is no record of which steps completed before the interruption.
4. The `resume` command can only resume from approval gate checkpoints, not from any interrupted step.
5. There is no `retry` command to re-run a single failed step without restarting the entire workflow.
6. The web UI cannot display a per-step progress timeline because step status is not persisted.
7. There is no per-step execution metadata (duration, error message, output paths).

This is a fundamental reliability gap. Users cannot trust the workflow engine to recover from failures gracefully.

## Current Evidence

- `packages/core/src/workflows/workflowEmitter.ts` — in-memory EventEmitter with MAX_HISTORY of 200 events per run; data is lost on restart
- `packages/storage/src/schema.ts` — no `step_executions` or `workflow_steps` table
- `packages/shared/src/types/domain.ts` — `RunStatus` has single-run-level statuses only (CODING, CODE_GENERATED, etc.), no step-level granularity
- `apps/cli/src/commands/resume.ts` — only resumes from approval gates (SCOPE, PLAN, CODE_GENERATION, RISKY_FILE), not from arbitrary interrupted steps
- `apps/cli/src/commands/cancel.ts` — sets run status to CANCELLED without saving which steps completed
- `packages/core/src/workflows/semiAutoWorkflow.ts` — calls agents sequentially but does not persist per-step completion
- `packages/core/src/workflows/assistedWorkflow.ts` — calls agents sequentially but does not persist per-step completion
- `packages/core/src/workflows/workflowRunner.ts` — gated workflow runs phases but no step-level tracking
- No `createStepExecutionRepository` or `step_executions` anywhere in `packages/storage/src/repositories/`
- No CLI command for `codeclaw steps <runId>` or `codeclaw retry <runId> --step <step>`
- No web UI component for step-level progress display

## Expected User Value

Users can:

1. Run a workflow and see which steps completed in real time.
2. Kill the terminal, restart, and resume from the last completed step.
3. Retry a single failed step without re-running everything.
4. View step-level execution details: agent name, duration, status, error message, output artifact paths.
5. Cancel a workflow and know exactly how far it got.
6. See step progress in the web UI with a clear timeline.

## Expected Behavior

1. Each workflow run has a persisted ordered list of steps.
2. Each step has a status: `PENDING` → `RUNNING` → `COMPLETED` / `FAILED` / `SKIPPED`.
3. When a workflow starts, all steps are pre-created with `PENDING` status.
4. As each agent completes, its step status is updated to `COMPLETED` with duration, artifact path, and optional error.
5. If an agent fails, its step is marked `FAILED` with the error message.
6. If the workflow is interrupted (process killed), the last running step remains `RUNNING` and can be detected on next startup.
7. `codeclaw resume <runId>` detects the first `RUNNING` or `FAILED` step and resumes or retries from there.
8. `codeclaw status <runId>` shows per-step status with timestamps.
9. `codeclaw retry <runId> --step <stepIndex>` re-runs a specific failed step and continues the workflow.
10. Web UI displays a step timeline with status icons and expandable details.

### Example CLI Usage

```bash
codeclaw status <runId>
# Output:
# Step 1/8: BA Analysis        ─ COMPLETED  (12.3s)
# Step 2/8: Architecture Design ─ COMPLETED  (8.1s)
# Step 3/8: Task Breakdown     ─ RUNNING    (15.2s so far)
# Step 4/8: Test Planning      ─ PENDING
# Step 5/8: UX Research        ─ PENDING
# Step 6/8: UI Design          ─ PENDING
# Step 7/8: Coding Plan        ─ PENDING
# Step 8/8: Final Report       ─ PENDING

codeclaw retry <runId> --step 3
# Re-runs only Task Breakdown and continues workflow from that point.
```

## Scope

### In Scope

- New `step_executions` SQLite table with run_id, step_index, step_name, agent_role, status, started_at, ended_at, duration_ms, error_message, output_artifact_path
- `StepExecutionRepository` for CRUD operations
- `StepStatus` type: `"PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED"`
- Wrapper or middleware in each workflow to create/update step status before and after agent calls
- CLI `status` command enhancements to show per-step details
- CLI `retry` command to re-run a failed step
- Enhanced `resume` command to detect interrupted steps (not just approval gates)
- Web UI step timeline in run detail page
- Backward compatibility: existing runs without step records show run-level status only
- Timer tracking per step (start, end, duration)

### Out of Scope

- Parallel step execution (all steps remain sequential)
- Automatic retry on failure (user must manually retry)
- Re-ordering steps (steps are defined by the workflow)
- Adding new steps mid-workflow
- Cross-run step comparison
- Step-level approval (approval gates remain a separate concept)

## Proposed Design

### New Types in `packages/shared/src/types/domain.ts`

```ts
export type StepStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";

export interface StepExecution {
  id: string;
  runId: string;
  stepIndex: number;
  stepName: string;
  agentRole: string | null;
  status: StepStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  outputArtifactPath: string | null;
}
```

### New Storage Schema in `packages/storage/src/schema.ts`

```sql
CREATE TABLE IF NOT EXISTS step_executions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  agent_role TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  started_at TEXT,
  ended_at TEXT,
  duration_ms INTEGER,
  error_message TEXT,
  output_artifact_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);
```

### New Repository in `packages/storage/src/repositories/`

- `createStepExecutionRepository(db)` returning `StepExecutionRepository`
- Methods: `create`, `findByRunId`, `findByRunIdAndStepIndex`, `updateStatus`, `updateComplete`

### New Core Service in `packages/core/src/workflows/`

- `stepExecutionService.ts` with `createStepRunner` higher-order function
- `createStepRunner` wraps an agent call, persists step lifecycle, captures duration and errors
- Workflows import and use step runner instead of calling agents directly

### CLI Changes

- `apps/cli/src/commands/status.ts` — enhanced to show per-step table when a run has step records
- `apps/cli/src/commands/retry.ts` — new command: `codeclaw retry <runId> --step <stepIndex>`
- `apps/cli/src/commands/resume.ts` — enhanced to detect `RUNNING` or `FAILED` steps and resume from there

### Web UI

- Step timeline component in run detail page (visible when run has step records)
- Each step shows: name, status icon, duration, expandable error details
- Retry button for failed steps

### Backward Compatibility

- Existing runs without step_executions records display run-level status only
- `step_executions` table is created by migration (schema.ts) with IF NOT EXISTS
- All existing CLI commands continue to work unchanged
- Workflows that do not use step runner continue to work with run-level status only

## Suggested Types / Interfaces

```ts
// packages/shared/src/types/domain.ts additions

export type StepStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";

export interface StepExecution {
  id: string;
  runId: string;
  stepIndex: number;
  stepName: string;
  agentRole: string | null;
  status: StepStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  outputArtifactPath: string | null;
}

// packages/core/src/workflows/stepExecutionService.ts

export interface StepRunnerOptions {
  runId: string;
  stepIndex: number;
  stepName: string;
  agentRole: string | null;
  execute: () => Promise<{ success: boolean; error?: string; artifactPath?: string }>;
}

export function createStepRunner(db: Database, options: StepRunnerOptions): Promise<StepExecution>;
```

## Suggested File Changes

### Create

- `packages/storage/src/repositories/stepExecutionRepository.ts`
- `packages/core/src/workflows/stepExecutionService.ts`
- `apps/cli/src/commands/retry.ts`
- `apps/local-web/src/components/StepTimeline.tsx` (or similar)

### Modify

- `packages/shared/src/types/domain.ts` — add `StepStatus`, `StepExecution`
- `packages/shared/src/index.ts` — export new types
- `packages/storage/src/schema.ts` — add `step_executions` table
- `packages/storage/src/index.ts` — export repository factory
- `packages/core/src/workflows/assistedWorkflow.ts` — wrap agent calls with step runner
- `packages/core/src/workflows/semiAutoWorkflow.ts` — wrap agent calls with step runner
- `packages/core/src/workflows/workflowRunner.ts` — wrap phases with step runner
- `packages/core/src/index.ts` — export step execution service
- `apps/cli/src/commands/status.ts` — show step details
- `apps/cli/src/commands/resume.ts` — detect interrupted steps
- `apps/cli/src/index.ts` — register retry command
- `apps/local-web/src/pages/RunDetail.tsx` — add step timeline section

## Detailed Implementation Plan

1. **Add shared types** — Add `StepStatus` and `StepExecution` to `packages/shared/src/types/domain.ts` and export from `packages/shared/src/index.ts`.

2. **Add storage schema** — Add `step_executions` CREATE TABLE statement to `packages/storage/src/schema.ts`.

3. **Add step execution repository** — Create `packages/storage/src/repositories/stepExecutionRepository.ts` with factory and CRUD methods: `create`, `findByRunId`, `findByRunIdAndStepIndex`, `updateStatus`, `updateComplete` (sets status, endedAt, durationMs, errorMessage, outputArtifactPath).

4. **Export repository** — Update `packages/storage/src/index.ts` to export `createStepExecutionRepository`.

5. **Create step execution service** — Create `packages/core/src/workflows/stepExecutionService.ts` with a `createStepRunner` function that:
   - Creates a step execution record with `RUNNING` status
   - Calls the execute function
   - Captures success/failure, duration, error message
   - Updates the step record to `COMPLETED` or `FAILED`
   - Returns the updated step execution record
   - Handles exceptions by marking step as `FAILED`

6. **Integrate into assisted workflow** — In `packages/core/src/workflows/assistedWorkflow.ts`:
   - Open database or accept db instance
   - Define the ordered step list (BA, Architect, Frontend Planner, Backend Planner, PM, QA, UX Research, UI Design, UX Writing, Coding Plan, Developer, Traceability, Reporter)
   - Before each agent call, create pre-step records with `PENDING`
   - Wrap each agent call with `createStepRunner`
   - On failure, return current status with failed step details

7. **Integrate into semi-auto workflow** — Same pattern as assisted workflow. Additional steps for code generation, test execution, fix loop.

8. **Integrate into workflow runner** — Same pattern for gated workflow phases.

9. **Update status command** — Enhance `apps/cli/src/commands/status.ts` to query `step_executions` table when available and display per-step table.

10. **Create retry command** — Create `apps/cli/src/commands/retry.ts`:
    - Accept `runId` and `--step <stepIndex>`
    - Find the failed step execution
    - Reset its status to `PENDING`
    - Re-run the workflow from that step index
    - Mark subsequent steps as `SKIPPED` initially, then re-run them

11. **Update resume command** — Enhance to detect if any step has `RUNNING` or `FAILED` status and resume from there, not just from approval gates.

12. **Add web UI component** — Create a step timeline component showing all steps with status icons, durations, expandable error messages.

13. **Add tests** — See Tests section below.

14. **Run verification** — `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## Acceptance Criteria

- New `step_executions` table is created in SQLite on schema initialization
- Assisted workflow persists ALL steps with correct status
- Semi-auto workflow persists ALL steps including code gen and test steps
- `codeclaw status <runId>` shows per-step table when steps exist
- `codeclaw resume <runId>` resumes from a RUNNING or FAILED step (not just approval gates)
- `codeclaw retry <runId> --step <stepIndex>` re-runs a failed step and continues
- If terminal is killed mid-workflow, the last running step remains `RUNNING`
- Step records do not contain any secrets
- Existing workflows without step records show run-level status only
- All existing tests still pass
- No secrets are stored in step_executions table, status output, or error messages

## Tests / Verification

### Unit Tests

- `packages/storage/src/repositories/stepExecutionRepository.test.ts` — test CRUD operations
- `packages/core/src/workflows/stepExecutionService.test.ts` — test step runner lifecycle (success, failure, exception)
- `apps/cli/src/commands/retry.test.ts` — test retry logic

### Integration Tests

- Assisted workflow with step tracking produces correct step records
- Semi-auto workflow with step tracking produces correct step records including code gen step
- Resume from interrupted step
- Retry failed step
- Cancel preserves step records

### Commands

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Edge Cases

- Workflow is killed before any step records are created (no steps to resume)
- Workflow is killed during a step (step stays `RUNNING`)
- Multiple steps are `FAILED` (resume from first failed step)
- Step index from retry command does not exist
- Step is not `FAILED` (retry rejects non-failed steps)
- Database is closed during step execution (step execution should handle gracefully)
- Run has no step records (status command shows run-level status only)
- Step execution record already exists for a new run (deduplicate by runId + stepIndex)
- Very long step durations (durationMs should handle up to large values)
- Error messages contain sensitive data (must redact)

## Security Considerations

- Step error messages may contain command output that includes secrets. All error messages stored in `step_executions.error_message` must be redacted using the existing `redactSecrets` utility from `packages/shared/src/utils/redact.ts`.
- Never store API keys, bearer tokens, session tokens, database passwords, private keys, OAuth tokens, or Slack tokens in step_executions table, status output, or error messages.
- The `output_artifact_path` field stores only a local file path, never secret content.
- Step execution metadata (step name, status, duration) is safe to store and display.
- Status command output must redact any error messages before printing.

## Backward Compatibility

- Existing runs without step_executions records display run-level status only (no change to current behavior).
- `step_executions` table is created with `IF NOT EXISTS` — no migration required for existing databases.
- All existing CLI commands continue to work unchanged.
- Existing workflows that do not use the step runner continue to function with run-level status only.
- The step execution service is opt-in: workflows must explicitly call `createStepRunner`.

## Risks

- Adding step tracking to existing workflows changes their behavior slightly (more DB writes). If a workflow fails mid-way, there may be orphan step records. Implement cleanup in the cancel command.
- The step execution table could grow large if users run many workflows. Add a cleanup mechanism in a future step. For now, the table is bounded by the number of steps per run (typically 8-15) × number of runs.
- Resume from interrupted step may be complex if the step had side effects (e.g., a partially written artifact). Document this limitation: resume does not undo partial side effects; it re-runs the step from scratch.
- Cross-platform path handling: `output_artifact_path` must use forward slashes or be normalized for cross-platform compatibility.

## Dependencies

- Storage package (schema and repository infrastructure)
- Shared types package (new StepStatus/StepExecution types)
- Core workflows (currently being modified)
- CLI command infrastructure (Commander.js)
- Web UI components (React)
- `redactSecrets` utility from shared package

## Notes for AI Coding Agent

1. **Implement in this order:** types → schema → repository → step execution service → workflow integration → CLI commands → web UI → tests.
2. **Do not rewrite workflows.** Add step tracking as a wrapper/adapter pattern, not by restructuring the workflow logic.
3. **Keep the step runner simple.** It should be a function that wraps another function, not a class or framework.
4. **Do not add step tracking to deterministic fallback paths.** The deterministic path is synchronous and fast; step tracking adds unnecessary overhead.
5. **Use an existing database connection where available.** Workflows that already open a DB should pass it to the step runner. For workflows that don't, open a temporary connection.
6. **Redact error messages** using the existing `redactSecrets` utility before storing in `error_message`.
7. **Test with mocked agents** to verify step lifecycle without actually running agents.
8. **Do not modify the domain.ts RunStatus enum.** Run-level status and step-level status are independent concepts.
9. **The resume command should remain backward-compatible** — if no step records exist, fall back to the current approval-gate-only resume logic.
10. **The retry command should only work for FAILED steps.** If a user tries to retry a COMPLETED or PENDING step, show a clear error message.
