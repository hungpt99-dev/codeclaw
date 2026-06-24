# STEP 05: Full Web UI Product Experience

## Status

Planned

## Priority

P4

## Goal

Build a complete, useful, production-quality local web UI for CodeClaw so users can manage projects, configure workflows, start runs, monitor step progress, review artifacts, inspect file changes, approve risky actions, and understand exactly what CodeClaw did.

## Why This Matters

CodeClaw should feel like a real local AI software team dashboard, not just a simple run/artifact viewer. The UI should help users answer:

- What project am I working on?
- What workflow am I running?
- Which step is running now?
- Which agent did what?
- What files changed?
- What artifacts were produced?
- Did tests pass?
- Is approval needed?
- What failed?
- What should I do next?

The CLI is still the main engine, but the local web UI makes the product accessible and gives users confidence in what the AI team is doing.

## Current Evidence

### Docs Inspected

- `docs/ARCHITECTURE.md` — Monorepo structure, dependency rules, local-first design
- `docs/LOCAL_WEB_UI_SPEC.md` — Full UI spec covering dashboard, new requirement, runs, settings, integrations, prompt templates, layouts, states, navigation
- `docs/WORKFLOW_DESIGN.md` — Workflow philosophy, stages, agent roles, approval gates, run statuses, workflow modes
- `docs/CLI_COMMAND_SPEC.md` — Full CLI command reference, run modes, step-by-step workflow
- `docs/SECURITY.md` — Local-first architecture, secrets management, no cloud backend
- `docs/DEVELOPMENT.md` — Setup, build, quality checks
- `docs/ROADMAP.md` — Product strategy, build layers, implementation phases
- `docs/CODE_QUALITY.md` — Linting, formatting, testing conventions
- `docs/PRODUCTION_READINESS.md` — Deployment, monitoring, security checklist
- `README.md` — CLI commands, AI backends, quick start, current limitations

### Existing UI Pages (`apps/local-web/src/pages/`)

- **Dashboard.tsx** (215 lines) — Shows total/completed/failed run counts, latest 5 runs table, local mode status badge, current project name from settings. No running count, no step progress, no agent/adapter status, no workflow template info.
- **Runs.tsx** (168 lines) — Simple table with title/mode/status/createdAt/action columns. No step counts, no duration, no latest step, no filters, no search, no project context.
- **RunDetail.tsx** (1792 lines) — Large page with tab-based artifact groups (requirement, design, tasks, tests, UX, implementation, report), diff viewer, export modal, approval display, workflow timeline via `WorkflowTimeline` component, agent activity indicator, integration panels (GitHub, Jira, Slack). Lacks step timeline from actual step records, step-level artifact grouping, execution report viewer, test result viewer, separate logs tab, proper loading/empty/error states for each section.
- **Settings.tsx** (823 lines) — App settings form (project name, type, commands), AI CLI tool status/test, agent mapping (which AI tool per role), safety settings, storage info, artifact type docs. Lacks provider/adapter backend settings, workflow template config, native runner status.
- **NewRequirement.tsx** — Requirement input form with mode/agent format options.
- **Integrations.tsx** — GitHub, Jira, Slack status/test/action panels.
- **PromptTemplates.tsx** — Template list, edit, reset.

### Existing UI Components (`apps/local-web/src/components/`)

- **Sidebar.tsx** — Navigation with Dashboard, New Requirement, Runs, Integrations, Settings, Prompt Templates. Shows local mode status indicator and version. No project selector, no workspace switching, no current project name.
- **WorkflowTimeline.tsx** — Timeline dots with completed/active/pending status using hardcoded stage names. Not backed by actual step records.
- **DiffViewer.tsx** (148 lines) — Full diff viewer with file list, file view, unified/side-by-side toggle, mark reviewed, stats. Handles empty/no-diff states.
- **DiffFileList.tsx** — File list with badges.
- **DiffFileView.tsx** — File-level diff display.
- **DiffStats.tsx** — Additions/deletions stats.
- **StatusBadge.tsx** — Status badge component.
- **MarkdownViewer.tsx** — Markdown rendering component.
- **AgentActivityIndicator.tsx** — Shows which agent is currently working.
- **AgentActivityIndicator.tsx** — Agent activity display.

### Existing Route files (`packages/server/src/routes/`)

- **runs.routes.ts** (725 lines) — `GET /api/runs`, `GET /api/runs/:id`, `POST /api/runs`, `GET /api/runs/:id/artifacts`, `GET /api/runs/:id/artifacts/:artifactId`, `GET /api/runs/:id/approvals`, `POST /api/runs/:id/approvals`, `GET /api/runs/:id/diff`, `GET /api/runs/:id/changed-files`, `GET /api/runs/:id/implementation-prompt`, `GET /api/runs/:id/agent-log`, `GET /api/runs/:id/traceability`, `POST /api/runs/:id/code`, `POST /api/runs/:id/test`, `POST /api/runs/:id/review`, `POST /api/runs/:id/export`, progress SSE. No `GET /api/runs/:id/steps`, no `GET /api/runs/:id/execution-report`, no `GET /api/runs/:id/logs`, no step counts in runs list.
- **settings.routes.ts** (258 lines) — Settings CRUD, AI CLI status/test, storage info/clean.
- **artifacts.routes.ts** — Artifact file serving.
- **integrations.routes.ts** — GitHub/Jira/Slack integration routes.
- **progress.routes.ts** — SSE progress events.
- **prompts.routes.ts** — Prompt template CRUD.
- **health.routes.ts** — Health check.

### Existing Data (`packages/storage/src/repositories/`)

- **runRepository.ts** — `findAll`, `findById`, `findRecent`, `create`, `updateStatus`. No step counts or duration tracking in run records.
- **stepExecutionRepository.ts** — `findByRunId`, `findByRunIdAndStepIndex`, `create`, `updateStatus`, `updateComplete`, `updateStartedAt`. Step records have: id, runId, stepIndex, stepName, agentRole, status, startedAt, endedAt, durationMs, errorMessage, outputArtifactPath.
- **artifactRepository.ts** — `create`, `findById`, `findByRunId`, `findByType`, `findAll`.
- **approvalRepository.ts** — Approval CRUD.
- **settingRepository.ts** — Settings CRUD.
- **traceabilityRepository.ts** — Traceability CRUD.
- **memoryRepository.ts** — Runtime memory.

### Existing Web UI Types (`apps/local-web/src/lib/types.ts`) — Run, Artifact, Setting, Approval, TestCommandResult, TestRunResult, CodeGenerationResult, WorkflowProgressEvent, etc. No StepRun type, no WorkflowTemplate type, no FileChangeSummary type, no DiffFileDetail type.

### Existing API Client (`apps/local-web/src/lib/api.ts`) — Methods for all existing routes. No `listSteps()` method, no workflow template methods, no execution report methods.

## Current Limitation

The web UI does not show:

- **Dashboard**: running/failed/waiting-approval counts, step progress summaries, agent/adapter status, native runner status, workflow template info, project context/selector
- **Run list**: step counts (total/completed/failed), duration, latest step name, filters by status/mode, search, project context
- **Run detail**: actual step records from storage (uses hardcoded WorkflowTimeline stages), step-level artifact grouping, execution report viewer, test result viewer, logs tab, step-level error messages, current step progress, approval gate status
- **Custom workflow**: no workflow template list, no custom workflow builder, no step enable/disable/reorder, no workflow preview
- **Settings**: no provider/adapter backend config UI, no native runner status, no workflow template config, no Ollama/AgentBackend provider settings
- **File change diff**: changed files API exists but UI diff viewer is inconsistently wired; no per-step file changes
- **Artifacts**: not grouped by step or workflow phase
- **Overall**: weak empty states, inconsistent loading states, no error recovery on individual panels, no project context awareness

## Expected User Experience

A user should be able to open the web UI and:

1. See a dashboard summary with project name, run stats, latest runs with step progress, and system status.
2. Select or understand the active project.
3. Browse runs with filters by status/mode, search by title/ID, see step progress at a glance.
4. Open a run detail page showing full header (status, duration, current step, progress bar).
5. See each step in a timeline with status icon, agent name, duration, expandable detail.
6. Inspect artifacts grouped by the step that generated them.
7. View execution/test/build/lint results with redacted output.
8. View file change diff with file list, additions/deletions, unified/side-by-side modes.
9. Copy implementation prompts.
10. View agent logs with redacted secrets.
11. See approval gates and approve/reject from the UI.
12. Browse workflow templates and create custom workflows.
13. Configure provider/adapter settings from the UI.
14. Understand errors clearly with suggested next actions.

## Scope

This step implements:

- Dashboard summary cards (total, running, completed, failed, waiting-approval)
- Dashboard latest runs with step progress
- Project context display
- Optional project selector (if STEP_02 multi-project data is available)
- Run list with step counts, duration, filters, search
- Run detail header with status banner, progress bar, current step, duration
- Step timeline from actual `StepExecution` records
- Expandable step detail panels with error messages, artifacts, execution data
- Run detail tabs system reorganized: Overview, Steps, Artifacts, Execution, Diff, Logs, Report
- Artifact browser grouped by workflow phase and step
- Implementation prompt viewer (already works, polish)
- Execution/test/build/lint result viewer
- File change diff viewer (already exists, wire consistently)
- Changed files summary with badges (added/modified/deleted/risky)
- Logs panel for agent logs and execution logs
- Approval gate UI with approve/reject actions
- Workflow template list
- Custom workflow builder (template list, detail view, enable/disable steps, basic editing)
- Workflow step configuration panel
- Settings page improvements (provider/adapter status, native runner, workflow config)
- Empty/loading/error states for each component
- Minimal server/API improvements where UI data is missing
- Redaction applied to all sensitive output before display
- Shared types for UI if missing

## Out of Scope

- Cloud backend
- User accounts, billing, team collaboration
- Remote workspaces
- Real external Jira/Slack/GitHub UI enhancements (already exist)
- A full design system rewrite or large branding redesign
- Fake live progress (use real SSE events)
- Fake diff data, execution results, test results, project data, agent data
- Core workflow engine changes (workflow templates use existing definitions)
- Authentication or authorization

## Proposed Design

```txt
CodeClaw Web UI
├── Sidebar
│   ├── Project selector (if multi-project)
│   ├── Dashboard
│   ├── Runs
│   ├── Workflows (new)
│   ├── Integrations
│   ├── Settings
│   └── Prompt Templates
│
├── Dashboard
│   ├── Project summary card
│   ├── Summary cards (total/running/completed/failed/waiting)
│   ├── Latest 5 runs with step progress
│   └── System status (local mode, adapter status)
│
├── Run List
│   ├── Filters bar (status, mode, search)
│   ├── Table columns: title, status, mode, steps, duration, created
│   └── Empty/loading/error states
│
├── Run Detail
│   ├── Header: run ID, requirement, status, mode, duration, progress bar
│   ├── Tabs:
│   │   ├── Overview
│   │   │   ├── Workflow timeline (from step records)
│   │   │   ├── Current step / next action
│   │   │   ├── Approval status
│   │   │   └── Summary artifacts
│   │   ├── Steps
│   │   │   ├── Step timeline table
│   │   │   └── Expandable step detail panel
│   │   ├── Artifacts
│   │   │   └── Files grouped by step/workflow phase
│   │   ├── Execution
│   │   │   ├── Test results
│   │   │   ├── Build/lint results
│   │   │   └── Execution report
│   │   ├── Diff
│   │   │   ├── Changed files summary
│   │   │   └── Diff viewer
│   │   ├── Logs
│   │   │   └── Agent logs, execution logs, redacted
│   │   └── Report
│   │       └── Final report viewer
│   └── Step detail drawer / expandable panel
│
├── Workflows (new)
│   ├── Workflow template list
│   ├── Workflow template detail
│   ├── Custom workflow builder
│   │   ├── Step list with enable/disable
│   │   ├── Step reorder (if supported)
│   │   ├── Step config (agent, approval requirement)
│   │   └── Preview / validate
│   └── Run from custom workflow
│
└── Settings
    ├── App settings form
    ├── AI CLI tool status/test
    ├── Agent mapping
    ├── Provider / AgentBackend settings (new)
    ├── Workflow defaults
    ├── Native runner status (new)
    ├── Storage info / clean
    └── Safety config
```

## Suggested Files To Create

- `apps/local-web/src/components/dashboard/DashboardSummaryCards.tsx` — summary stat cards
- `apps/local-web/src/components/runs/RunListFilters.tsx` — filter/search bar
- `apps/local-web/src/components/runs/RunDetailHeader.tsx` — header with progress
- `apps/local-web/src/components/runs/RunProgressBanner.tsx` — running progress display
- `apps/local-web/src/components/runs/StepTimeline.tsx` — step timeline from records
- `apps/local-web/src/components/runs/StepDetailPanel.tsx` — expandable step detail
- `apps/local-web/src/components/runs/RunArtifactsPanel.tsx` — artifacts grouped by step
- `apps/local-web/src/components/runs/RunExecutionPanel.tsx` — execution/test results
- `apps/local-web/src/components/runs/RunDiffPanel.tsx` — diff viewer wrapper
- `apps/local-web/src/components/runs/RunLogsPanel.tsx` — logs viewer
- `apps/local-web/src/components/runs/RunOverviewTab.tsx` — overview tab content
- `apps/local-web/src/components/settings/ProviderSettingsPanel.tsx` — provider config
- `apps/local-web/src/components/settings/NativeRunnerStatusPanel.tsx` — runner status
- `apps/local-web/src/components/settings/WorkflowDefaultsPanel.tsx` — workflow defaults
- `apps/local-web/src/components/workflows/WorkflowTemplateList.tsx` — template list
- `apps/local-web/src/components/workflows/WorkflowTemplateDetail.tsx` — template detail
- `apps/local-web/src/components/workflows/CustomWorkflowBuilder.tsx` — workflow editor
- `apps/local-web/src/components/workflows/WorkflowStepEditor.tsx` — step config
- `apps/local-web/src/components/workflows/WorkflowPreview.tsx` — workflow preview
- `apps/local-web/src/pages/Workflows.tsx` — new Workflows page

## Suggested Files To Modify

- `apps/local-web/src/App.tsx` — add Workflows route
- `apps/local-web/src/components/Sidebar.tsx` — add Workflows nav item, project selector
- `apps/local-web/src/pages/Dashboard.tsx` — refactor to use DashboardSummaryCards, show step progress
- `apps/local-web/src/pages/Runs.tsx` — add filters, step counts, duration columns
- `apps/local-web/src/pages/RunDetail.tsx` — reorganize tabs, integrate step timeline, step detail, execution panel, logs panel
- `apps/local-web/src/pages/Settings.tsx` — add ProviderSettingsPanel, NativeRunnerStatusPanel, WorkflowDefaultsPanel
- `apps/local-web/src/lib/types.ts` — add StepRun, WorkflowTemplate, FileChangeSummary, DiffFileDetail types
- `apps/local-web/src/lib/api.ts` — add listSteps(), workflow template methods, execution report methods
- `packages/server/src/routes/runs.routes.ts` — add `GET /api/runs/:id/steps`, add step counts to `GET /api/runs`, add `GET /api/runs/:id/execution-report`
- `packages/server/src/routes/settings.routes.ts` — add provider/adapter status endpoint, native runner check
- `packages/shared/src/types/domain.ts` — add `WorkflowTemplate` type if missing
- `docs/LOCAL_WEB_UI_SPEC.md` — update with new pages and components
- `docs/WORKFLOW_DESIGN.md` — add workflow template details

## Data Model / Types / Schemas

### Existing Types (reuse these)

```ts
// From @codeclaw/shared
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

### Web UI Types (add to `apps/local-web/src/lib/types.ts`)

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

export interface WorkflowTemplate {
  workflowTemplateId: string;
  name: string;
  description?: string;
  steps: WorkflowStepDefinition[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStepDefinition {
  id: string;
  name: string;
  agentName?: string;
  enabled: boolean;
  requiresApproval?: boolean;
  producesArtifacts?: boolean;
  description?: string;
}

export interface FileChangeSummary {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "unknown";
  additions?: number;
  deletions?: number;
  isBinary?: boolean;
  isLarge?: boolean;
  isRisky?: boolean;
}

export interface DiffFileDetail {
  path: string;
  status: FileChangeSummary["status"];
  diffText?: string;
  isBinary?: boolean;
  isLarge?: boolean;
  redacted: boolean;
}
```

### Enhanced Run type (extend existing, add step counts)

The existing `Run` interface should be extended with optional step count fields when the API returns them:

```ts
// In existing Run interface, add optional fields
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
  currentStepName?: string;
  durationMs?: number;
}
```

## API / Server Changes

### Add `GET /api/runs/:id/steps`

```ts
app.get("/api/runs/:id/steps", async (request, reply) => {
  const params = request.params as { id: string };
  const stepRepo = createStepExecutionRepository(db);
  const steps = stepRepo.findByRunId(params.id);
  return { steps };
});
```

### Enhance `GET /api/runs` with step counts

Add a single SQL query with a LEFT JOIN or a batch-fetch to include step counts:

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

For performance with many runs, use a single SQL subquery instead of N+1.

### Add `GET /api/runs/:id/execution-report`

```ts
app.get("/api/runs/:id/execution-report", async (request, reply) => {
  const params = request.params as { id: string };
  const paths = getArtifactPaths(params.id);
  try {
    const content = await readFile(paths.opencodeExecutionReportPath, "utf-8");
    return { report: content };
  } catch {
    return reply.status(404).send({ error: "Execution report not found" });
  }
});
```

### Add `GET /api/settings/providers` (optional, for AgentBackend status)

Return current agent backend provider config (without secrets):

```ts
app.get("/api/settings/providers", async (_request, reply) => {
  const configPath = join(codeclawDir ?? ".codeclaw", "config.json");
  try {
    const raw = await readFile(configPath, "utf-8");
    const config = JSON.parse(raw) as Record<string, unknown>;
    const agentBackend = config.agentBackend as Record<string, unknown> | undefined;
    return {
      provider: agentBackend?.provider ?? "none",
      model: agentBackend?.model ?? null,
      baseUrl: agentBackend?.baseUrl ?? null,
      apiKeyEnv: agentBackend?.apiKeyEnv ?? null,
      timeoutMs: agentBackend?.timeoutMs ?? null,
    };
  } catch {
    return { provider: "none", model: null, baseUrl: null, apiKeyEnv: null, timeoutMs: null };
  }
});
```

## Web UI Changes

### Sidebar

- Add "Workflows" nav item between Runs and Integrations.
- Add project selector dropdown at top if multi-project data is available.
- Show current project name.

### Dashboard

- Refactor into sections: Project Summary, Summary Cards, Latest Runs, System Status.
- Summary Cards: Total, Running, Completed, Failed, Waiting for Approval.
- Latest Runs: Show step progress (e.g., "5/8 steps"), current step name, duration.
- System Status: Local mode, AI CLI tool availability, native runner status.
- Empty state: prompt to create first requirement.
- Loading state: skeleton cards.
- Error state: retry button.

### Run List

- Add filter bar: status dropdown, mode dropdown, search input (by title/ID).
- Table columns: Title, Status, Mode, Steps (e.g., "5/8 ✅2 ❌1"), Duration, Created, Action.
- Each run row links to run detail.
- Empty/filtered-empty states.
- Loading spinner.
- Error state with retry.

### Run Detail Header

- Requirement summary with expandable full text.
- Status badge with appropriate colors.
- Mode badge.
- Duration display.
- Progress bar: `[████████░░░░] 5/8 steps`.
- Current step name if running.
- Created/updated timestamps.
- Approval required badge if pending approval.

### Step Timeline

- New "Steps" tab showing all step records from storage.
- Table columns: `#`, Step Name, Agent, Status (icon + text), Duration, Error indicator.
- Rows color-coded by status: green for completed, blue for running, red for failed, gray for pending/skipped.
- Running step shows animated pulse.
- Click row to expand detail panel.
- Empty state when no step data: "Step tracking not available for this run".

### Step Detail (expandable panel)

- Step name and ID.
- Agent name.
- Status with timestamp.
- Duration (or "running" / "N/A").
- Error message if failed (redacted).
- Artifact list (files from `outputArtifactPath` or cross-referenced).
- Execution report link if available.
- Approval status if relevant.

### Artifacts Tab

- Group artifacts by workflow phase (requirement, design, tasks, etc.) and by step if step data exists.
- Each artifact row: name, type, format, created time, related step (if available).
- Click to preview content (use MarkdownViewer).
- Download/open action.
- Empty state.

### Execution Tab

- Test results: overall status (PASSED/FAILED), per-command results with exit code, duration, stdout/stderr preview (redacted).
- Build results if available.
- Lint results if available.
- Links to full execution report artifact.
- Empty state: "No test results for this run."
- Error state if data unavailable.

### Diff Tab

- Changed files summary (count, added/modified/deleted).
- File list with status badges.
- Risky file warnings.
- Diff viewer (use existing DiffViewer component).
- Empty state: "No file changes for this run."
- Error state: "Diff data not available."

### Logs Tab

- Agent log content (redacted).
- Execution log content (redacted).
- Toggle between log types if both exist.
- Plain text viewer with monospace font.
- Empty state: "No logs available."
- Error state.

### Report Tab

- Final report rendered via MarkdownViewer.
- Already exists — just ensure consistent tab placement.

### Approval UI

- Show pending approval gates in run detail header and overview.
- Gate type, status, summary.
- Approve / Reject buttons that call the API.
- Note input for approval/rejection.
- Approval history list.
- Read-only display for completed approvals.

### Workflows Page (new)

- **Workflow Template List**: cards or table showing available workflow templates. Each shows name, description, step count, default badge.
- **Default workflow** highlighted.
- **Template Detail**: click to expand showing full step list with agent names and descriptions.
- **Custom Workflow Builder**:
  - Start from a template or create new.
  - Enable/disable steps.
  - Reorder steps (if architecture supports it; use drag-and-drop or move buttons).
  - Configure step agent (if supported).
  - Set requires-approval per step.
  - Edit step name/description.
  - Validate workflow (at least one enabled step).
  - Preview ordered step list.
  - "Run with this workflow" action.
- **Empty state**: fall back to default workflow.
- Phase 1: read-only template viewer; Phase 2: enable/disable; Phase 3: reorder.

### Settings Improvements

- **Provider Settings panel**: Show current AgentBackend provider (none/openai-compatible/ollama/mock), model name, base URL, API key env name (not value). Allow switching provider, setting model, base URL.
- **Adapter status panel**: Show which AI CLI tools are installed and enabled.
- **Native runner status**: Show if native runner is available, version if detectable.
- **Workflow defaults panel**: Default mode, output language, template selection.

### Loading / Empty / Error States

- Every data-fetching component must handle loading, empty, and error states.
- Loading: skeleton or spinner.
- Empty: descriptive message with suggested action.
- Error: error message with retry button.
- "No step tracking data available for this run." (old run)
- "No file change diff available for this run." (docs-only run)
- "Default workflow or legacy run." (no workflow template)
- "Provider not configured." / "Ollama not running." / "API key not set."

## Implementation Phases

Because this is a large UI step, implement in phases inside the same step.

### Phase 1: Run Visibility

- Add `GET /api/runs/:id/steps` endpoint
- Add step counts to `GET /api/runs`
- Add `StepRun` type to web UI types
- Add `listSteps()` to API client
- Dashboard summary cards (total/running/completed/failed/waiting)
- Run list filters (status, mode, search)
- Run list step count columns
- Run detail header with progress bar
- Step timeline component from real step records

### Phase 2: Step Detail and Artifacts

- Step detail expandable panel
- Artifact grouping by step
- Run detail tabs reorganization
- Overview tab with workflow timeline and summary
- Empty/loading/error states for step and artifact data

### Phase 3: Outputs and Reports

- Execution/test result panel
- `GET /api/runs/:id/execution-report` endpoint
- Logs panel (agent logs, execution logs)
- Redaction on all displayed output
- Report tab polish

### Phase 4: File Change Diff

- Changed files summary in diff tab
- Wire diff viewer consistently
- Handle large/binary/redacted diff
- Empty/error states for diff data

### Phase 5: Workflow Templates

- Workflow page with template list
- Template detail view
- Custom workflow builder (basic: enable/disable steps)
- Workflow preview
- Workflow types in web UI types

### Phase 6: Settings and Polish

- Provider/adapter settings panel
- Native runner status
- Workflow defaults panel
- Sidebar project selector
- Sidebar Workflows nav item
- Responsive polish
- Docs update
- End-to-end testing

## Tests To Add

- `apps/local-web/src/components/dashboard/DashboardSummaryCards.test.tsx` — renders real run stats, handles empty
- `apps/local-web/src/components/runs/StepTimeline.test.tsx` — renders steps, all statuses, handles empty
- `apps/local-web/src/components/runs/StepDetailPanel.test.tsx` — renders step data, error message, no data
- `apps/local-web/src/components/runs/RunListFilters.test.tsx` — filter/search works
- `apps/local-web/src/pages/RunDetail.test.tsx` — tabs render, step timeline renders, load/error states
- `apps/local-web/src/pages/Dashboard.test.tsx` — summary cards, running count, step progress
- `apps/local-web/src/pages/Workflows.test.tsx` — template list, custom builder, validation
- `apps/local-web/src/components/runs/RunExecutionPanel.test.tsx` — test results, empty state
- `apps/local-web/src/components/runs/RunDiffPanel.test.tsx` — changed files, diff viewer, empty state
- `apps/local-web/src/components/runs/RunLogsPanel.test.tsx` — log display, redacted output
- `packages/server/src/routes/runs.routes.test.ts` — steps API, enhanced runs list
- `packages/server/src/routes/settings.routes.test.ts` — provider status

Use mocked API responses for UI tests. Do not require real AI providers, real CLI tools, or real git changes.

## Verification Commands

```bash
pnpm test
pnpm build
pnpm lint
pnpm typecheck
```

## Acceptance Criteria

- Dashboard shows real run stats (total, running, completed, failed, waiting)
- Dashboard shows latest runs with step progress
- Run list includes step counts, mode, duration, filters, search
- Run detail header shows status, progress bar, current step, duration
- Steps tab shows all step records from storage with status, agent, duration
- Step detail panel expands to show full metadata and redacted error messages
- Artifacts tab groups files by workflow phase and step
- Execution tab shows test results with redacted output
- Diff tab shows changed files summary and diff viewer
- Logs tab shows agent logs with redacted secrets
- Approval gates show status and approve/reject actions
- Workflows page lists templates and supports basic customization
- Settings page shows provider/adapter status and native runner info
- All components handle loading, empty, and error states
- No secrets exposed in UI output
- Old runs with missing data show graceful empty states instead of crashes
- All existing tests pass

## Risks

- Backend may not expose enough data yet (steps API, step counts, execution report, provider status). Mitigated by adding minimal endpoints per phase.
- Storage may not persist all UI-needed fields. Step data already exists in `step_executions` table. Workflow templates may need a new storage model — if so, use a simple JSON-based template definition initially.
- Diff viewer depends on native runner or git diff output. If diff data is missing, show honest empty state.
- Old runs may have incomplete step data, no diff, no execution report. The UI must not crash — show empty states with descriptive messages.
- Step status names may be inconsistent between storage and shared types. Use the canonical `StepStatus` from shared types.
- Execution output may contain secrets. Redaction is already applied by `stepExecutionService` and `canonical_redactSecrets`. Verify redaction on all UI output paths.
- The UI can become too crowded without tabs and progressive disclosure. The proposed tab structure in run detail and collapsible step panels address this.
- Workflow template storage may not exist. Phase 1 starts with hardcoded default templates read from workflow definitions. Phase 2 can add a workflow_templates table.

## Dependencies

- Existing local web UI pages and components
- Existing local server API routes
- Existing `step_executions` storage table and repository
- Existing `StepExecution` and `StepStatus` shared types
- Existing artifact, approval, and run storage
- Existing diff data from native runner / git
- Existing SSE progress events
- Shared types for step data (already exists)
- Multi-project support from STEP_02 (optional, for project selector)

## Notes For Next OpenCode Run

1. **Start with the API** — `GET /api/runs/:id/steps` is the simplest change and unblocks the step timeline. Add step counts to `GET /api/runs` next.
2. **Follow existing route patterns** — Use `createStepExecutionRepository` the same way other routes in `runs.routes.ts` use repositories.
3. **Step data is already structured** — `StepExecution` from shared matches the repository return type. The web UI `StepRun` type mirrors it.
4. **Reuse `WorkflowTimeline`** — The existing component renders hardcoded stages. Replace with actual step data when step records are available. For runs without step data, fall back to hardcoded stages.
5. **Step artifacts** — Each step has `outputArtifactPath` (single file). To show multiple artifacts per step, cross-reference with the artifacts table using path prefix matching.
6. **Progress integration** — The SSE progress events provide real-time updates. The run detail page already subscribes to them. When a step completes, refresh the steps list.
7. **Workflow templates** — Start with a hardcoded array of default templates in the UI. Store custom templates in `config.json` or a new `workflow_templates` table if persistence is needed.
8. **Do not fake data** — If backend data is missing, show an honest empty/unavailable state. Do not generate fake step records, fake diff content, or fake execution results.
9. **Redact everywhere** — Apply `canonical_redactSecrets` to any command output, error messages, logs, and diff content before displaying in the UI. The `stepExecutionService` already redacts error messages before storage.
10. **Project selector** — If STEP_02's project registry exists, use `GET /api/projects` and `resolveProjectDir()` to switch context. If not, hide the selector.
