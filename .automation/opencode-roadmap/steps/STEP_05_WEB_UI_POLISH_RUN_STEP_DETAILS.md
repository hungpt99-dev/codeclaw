# STEP 05: Web UI Polish — Run and Step Details

## Status

Planned

## Priority

P4

## Goal

Polish the CodeClaw local web UI so users can see run-level and step-level detail: status, timeline, agent activity, duration, artifacts per step, errors, approvals, execution results, and test results.

## Why This Matters

CodeClaw should feel like a full local AI software team dashboard. Currently the web UI shows basic run info and artifacts but lacks step-level visibility. Users have to use the CLI (`codeclaw status --run <id>`) to see step details. The web UI should provide the same or better visibility.

## Current Evidence

### Existing UI Components

- `apps/local-web/src/pages/Dashboard.tsx` — shows total/completed/failed counts, last 5 runs, no step data
- `apps/local-web/src/pages/Runs.tsx` — table with title/mode/status/createdAt, no step/artifact counts
- `apps/local-web/src/pages/RunDetail.tsx` — tabs with artifact groups, diff viewer, export modal, approval display, workflow progress via `WorkflowTimeline`, agent activity indicator
- `apps/local-web/src/components/WorkflowTimeline.tsx` — basic timeline dots with completed/active/pending status
- `apps/local-web/src/components/DiffViewer.tsx` — diff display component
- `apps/local-web/src/components/AgentActivityIndicator.tsx` — shows which agent is currently working
- `apps/local-web/src/components/StatusBadge.tsx` — status badge component

### Existing Data Layer

- `packages/storage/src/repositories/stepExecutionRepository.ts` — `findByRunId` returns step records with status, timestamps, durations, errors, artifact paths
- `packages/shared/src/types/domain.ts` — `StepStatus` type, `StepExecution` interface
- `packages/core/src/workflows/stepExecutionService.ts` — step tracking service

### Missing Data Layer

- No server API to serve step data (`GET /api/runs/:id/steps` does not exist)
- No server API to serve execution reports
- Dashboard and run list APIs don't include step summary counts

### What Currently Shows

- Run detail has artifact groups (requirement/, design/, tasks/, etc.) with file list
- WorkflowTimeline shows generic stages (BA, Architect, PM, etc.) but NOT actual step data
- No per-step duration, errors, or agent names
- No execution report section
- No test result section
- No step-level artifact grouping

## Current Limitation

The web UI does not show:

- step-level timeline with actual step records
- step status (pending/running/completed/failed/skipped)
- step agent names
- step duration
- step error messages
- step artifacts
- execution reports
- test results
- summary stats on dashboard (running runs, failed runs, step counts)

All of this data exists in the storage layer but is not served by the API or displayed in the UI.

## Expected User Experience

### Dashboard

```
┌─────────────────────────────────────────┐
│  Dashboard                              │
│                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ Total  │ │Running │ │Failed  │      │
│  │   12   │ │    2   │ │    1   │      │
│  └────────┘ └────────┘ └────────┘      │
│                                         │
│  Latest Runs:                           │
│  ┌──────────────────────────────────┐   │
│  │ build login page    RUNNING  5/8 │   │
│  │ add auth            COMPLETED   │   │
│  │ export CSV          FAILED    3/5│   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Run Detail

```
Run: run_20260624_...
Build a login page          Status: RUNNING
Mode: assisted              Duration: 2m 34s

Steps (8):
  1. ✅ BA Analysis           Agent: BA        12.3s
  2. ✅ Architecture Design   Agent: Architect  8.1s
  3. ⏳ Task Breakdown        Agent: PM         15.2s (running)
  4. ⏸️ Test Planning         Agent: QA         pending
  5. ⏸️ UX Research           Agent: UX         pending
  ...

┌─────────────────────────────────────────┐
│  Tabs: Overview | Steps | Artifacts |   │
│        Execution | Diff | Logs          │
└─────────────────────────────────────────┘
```

### Step Detail (expandable)

```
▼ Step 3: Task Breakdown
  Agent: PM           Status: ✅ Completed
  Started: 12:34:01   Duration: 12.3s
  Artifacts:
    - task-breakdown.md
    - task-breakdown.json
  Error: (none)
```

## Scope

- Add `GET /api/runs/:id/steps` server endpoint serving step records
- Enhance `GET /api/runs` to include step summary counts (total, completed, failed)
- Add step timeline component to run detail page
- Add expandable step detail panels
- Add step count/duration to run list
- Add running/failed step counts to dashboard
- Update shared types for step API responses
- Add loading/empty/error states for step data

## Out of Scope

- Full UI redesign
- New branding or design system
- Cloud backend
- Authentication
- Live auto-refresh (SSE already exists for progress)
- Mobile responsive layout overhaul
- Multi-project selector (covered in STEP_02)

## Proposed Design

### API Changes

Add a new server route:

```
GET /api/runs/:id/steps
```

Response:

```json
{
  "steps": [
    {
      "id": "run_abc_step_0",
      "runId": "run_abc",
      "stepIndex": 0,
      "stepName": "BA Analysis",
      "agentRole": "BA",
      "status": "COMPLETED",
      "startedAt": "2025-01-01T00:00:00Z",
      "endedAt": "2025-01-01T00:00:12Z",
      "durationMs": 12300,
      "errorMessage": null,
      "outputArtifactPath": null
    }
  ]
}
```

Enhance the existing runs list response to include step counts:

```json
{
  "runs": [
    {
      "id": "run_abc",
      "title": "Build a login page",
      "status": "CODING",
      "mode": "semi-auto",
      "createdAt": "...",
      "updatedAt": "...",
      "totalSteps": 8,
      "completedSteps": 2,
      "failedSteps": 0
    }
  ]
}
```

### UI Component Changes

**Dashboard** — add "Running" card, display step counts on run links, show latest status with step progress.

**Run List** — add columns for step progress (e.g., "3/8 steps"), duration, and latest step.

**Run Detail Header** — add step progress bar, current step name, duration display.

**Run Detail Steps Tab** — new tab showing step timeline with all step records. Each row shows status icon, step name, agent, duration. Clicking a row expands to show details.

**Step Detail** — expanded row within the steps tab shows:
- Full step metadata
- Error message (if failed)
- Artifact list (files from step)
- Execution report link (if available)

### Integration

Steps data is fetched via the new API endpoint on component mount. The step data from storage is already structured correctly — no new storage queries needed.

### Existing Data Reuse

The `WorkflowTimeline` component renders stages. The new step timeline should render actual `StepExecution` records instead of or in addition to the current hardcoded stage names.

## Suggested Files To Create

- `apps/local-web/src/components/runs/StepTimeline.tsx` — step timeline/table component
- `apps/local-web/src/components/runs/StepDetailPanel.tsx` — expandable step detail panel

## Suggested Files To Modify

- `packages/server/src/routes/runs.routes.ts` — add `GET /api/runs/:id/steps`, enhance run list with step counts
- `apps/local-web/src/lib/api.ts` — add `listSteps()` method
- `apps/local-web/src/lib/types.ts` — add `StepRun` interface (mirroring `StepExecution` from shared)
- `apps/local-web/src/pages/Dashboard.tsx` — add running count, step counts to latest runs
- `apps/local-web/src/pages/Runs.tsx` — add step count column
- `apps/local-web/src/pages/RunDetail.tsx` — add Steps tab, step timeline, step detail, progress bar in header
- `apps/local-web/src/components/WorkflowTimeline.tsx` — optionally integrate step data for progress display

## Data Model / Types / Schemas

### Shared Type (already exists in `packages/shared/src/types/domain.ts`)

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

### Web UI Type (add to `apps/local-web/src/lib/types.ts`)

```ts
export interface StepRun {
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

export type StepStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";
```

### Enhanced Run type

The existing `Run` interface in the web UI types should be extended when the API returns step counts. Use optional fields:

```ts
export interface Run {
  id: string;
  title: string;
  rawRequirement: string;
  mode: string;
  outputLanguage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalSteps?: number;
  completedSteps?: number;
  failedSteps?: number;
}
```

## API / Server Changes

### Add `/api/runs/:id/steps` GET endpoint

```ts
app.get("/api/runs/:id/steps", async (request, reply) => {
  const params = request.params as { id: string };
  const stepRepo = createStepExecutionRepository(db);
  const steps = stepRepo.findByRunId(params.id);
  return { steps };
});
```

### Enhance `GET /api/runs` to include step counts

Replace the simple `repo.findAll()` with a query that also fetches step counts. Use a subquery or a second query:

```ts
app.get("/api/runs", async (_request, _reply) => {
  const repo = createRunRepository(db);
  const runs = repo.findAll();
  const stepRepo = createStepExecutionRepository(db);
  const runsWithSteps = runs.map((run) => {
    const steps = stepRepo.findByRunId(run.id);
    return {
      ...run,
      totalSteps: steps.length,
      completedSteps: steps.filter((s) => s.status === "COMPLETED").length,
      failedSteps: steps.filter((s) => s.status === "FAILED").length,
    };
  });
  return { runs: runsWithSteps };
});
```

For performance, batch the step queries in a single SQL query rather than N+1.

## Web UI Changes

### Dashboard

Add a "Running" card between "Completed" and "Failed":

```tsx
const running = runs.filter((r) =>
  ["CODING", "TESTING", "CREATED"].includes(r.status)
).length;
```

Display step progress on latest run items: e.g., `"3/8 steps"` and the last completed step name.

### Run List

Add columns:

- **Steps** — `"5/8"` or `"✅ 5/8 ❌ 1"` if failed
- **Duration** — if available from run data
- **Latest step** — last step name (from step data)

### Run Detail Header

Between the title/status line and the tabs, add:

- Step progress bar: `[████████░░░░] 5/8 steps`
- Current step: `BA Analysis (12.3s)`
- Duration: `2m 34s`

### Steps Tab

Add a new tab panel in the existing tab system:

```
Steps (8)
┌──────────────────────────────────────────────────┐
│  # │ Step           │ Agent    │ Duration │ Err │
│ ──┼─────────────────┼──────────┼──────────┼─────│
│  1 │ BA Analysis     │ BA       │ 12.3s    │     │ ✅
│  2 │ Architecture    │ Architect│ 8.1s     │     │ ✅
│  3 │ Task Breakdown  │ PM       │ running  │     │ ⏳
│ ...                                                │
└──────────────────────────────────────────────────┘
```

Clicking a row expands the StepDetailPanel:

```
▼ Step 3: Task Breakdown
  Agent: PM               Status: ⏳ RUNNING
  Started: 2025-01-01     Duration: 15.2s so far
  Artifacts:
    - task-breakdown.md
    - task-breakdown.json
  Error: none
```

### Empty / Loading / Error States

- **No steps data**: show "Step tracking data is not available for this run. This run was created before step tracking was implemented."
- **Loading steps**: show spinner
- **Steps API error**: show error message with retry button
- **Step detail not found**: n/a (data comes from the same API response)

## Storage Changes

No storage changes needed. The `step_executions` table and repository already provide `findByRunId`.

## Rust Runner / Native Execution Changes

Not required for this step.

## Security Considerations

- Step error messages may contain command output with secrets. The `stepExecutionService` already redacts error messages via `redactSecrets` before storing in the `error_message` column. Verify this redaction is working.
- Step data API should not expose `outputArtifactPath` as an absolute path unless the product intentionally does so (the CLI `status` command already shows these paths).
- Apply existing `redactSecrets` to any step output displayed in the UI.
- No new API endpoints that accept user input — only `GET` with a path parameter.

## Backward Compatibility

- Runs created before step tracking was implemented have no step records. The UI should show "No step tracking data available" instead of an empty table.
- The existing `WorkflowTimeline` component provides progress for runs with workflow events. The new step timeline should work alongside it (or replace it for runs with step data).
- All existing API responses remain unchanged. The enhanced run list adds new optional fields.
- Old clients that don't understand the new step count fields ignore them.

## Detailed Implementation Plan

1. **Add step API endpoint** — Add `GET /api/runs/:id/steps` to `packages/server/src/routes/runs.routes.ts` using `createStepExecutionRepository`
2. **Enhance run list API** — Add step counts query to `GET /api/runs`
3. **Add web UI types** — Add `StepRun` interface and `StepStatus` type to `apps/local-web/src/lib/types.ts`
4. **Add API client method** — Add `listSteps(runId)` to `apps/local-web/src/lib/api.ts`
5. **Enhance Dashboard** — Add running count, step progress on latest runs
6. **Enhance Run List** — Add step count and duration columns
7. **Enhance Run Detail header** — Add step progress bar and current step display
8. **Create StepTimeline component** — Table with status, name, agent, duration columns
9. **Create StepDetailPanel component** — Expandable panel with full step metadata
10. **Wire into RunDetail** — Add Steps tab panel, integrate step timeline
11. **Add empty/loading/error states** — Handle missing step data gracefully
12. **Apply redaction** — Ensure error messages are redacted before display
13. **Run verification** — `pnpm test`, `pnpm lint`, `pnpm typecheck`

## Tests To Add

- `packages/server/src/routes/runs.routes.test.ts` — test steps API returns correct data
- `apps/local-web/src/components/runs/StepTimeline.test.tsx` — renders steps, handles empty state
- `apps/local-web/src/components/runs/StepDetailPanel.test.tsx` — renders step details, handles error message
- Update `apps/local-web/src/pages/Dashboard.test.tsx` — verify running count and step counts

## Verification Commands

```bash
pnpm test
pnpm build
pnpm lint
pnpm typecheck
```

## Acceptance Criteria

- `GET /api/runs/:id/steps` returns step records from the database
- `GET /api/runs` returns enhanced run data with `totalSteps`, `completedSteps`, `failedSteps`
- Dashboard shows running runs count
- Run list shows step counts per run
- Run detail header shows step progress bar with current step
- Steps tab shows all steps with status icons, agent names, durations
- Expandable step detail shows full metadata and error messages (redacted)
- Runs with no step data show a clear empty state message
- Loading states show spinners
- Error states show error messages
- All existing tests pass
- No secrets exposed in step error messages or UI

## Risks

- N+1 query problem: enhancing `GET /api/runs` to include step counts for each run could be slow for users with many runs. Mitigate by using a single SQL query with a subquery or batch loading.
- The step records use `status` values like `"RUNNING"` that may never appear in practice if the process was killed abruptly. The UI should handle any `StepStatus` value gracefully.
- Duration values may be `null` for steps that never completed. The UI should show "—" or "N/A" instead of crashing.
- Step error messages are redacted by the step execution service, but verify this is working correctly before display.

## Dependencies

- `packages/storage/src/repositories/stepExecutionRepository.ts` — already exists with `findByRunId`
- `packages/shared/src/types/domain.ts` — `StepExecution` interface already exists
- `packages/core/src/workflows/stepExecutionService.ts` — already integrates redaction
- `apps/local-web/src/lib/api.ts` — existing API client pattern to follow

## Notes For Next OpenCode Run

1. **Start with the API** — Adding `GET /api/runs/:id/steps` is the simplest change and unblocks all UI work
2. **Follow existing route patterns** — Use `createRunRepository` and `createStepExecutionRepository` the same way other routes do
3. **The step data is already structured** — `StepExecution` from shared matches what the repository returns, just pass it through
4. **Reuse `StepStatus` from shared** — Don't redefine it in the web UI types; import from the shared package or define a compatible type
5. **Step artifacts** — Each step has `outputArtifactPath` which is a single file path. To show multiple artifacts per step, you'll need to cross-reference with the artifacts table using the file path as a prefix match
6. **Progress integration** — The existing `WorkflowTimeline` uses hardcoded stages. The new step timeline should use actual step records. Consider replacing the hardcoded stages when step data is available
7. **Performance note** — For the runs list step counts, avoid N+1 queries. Either join in the SQL or batch-fetch all step counts in one query
