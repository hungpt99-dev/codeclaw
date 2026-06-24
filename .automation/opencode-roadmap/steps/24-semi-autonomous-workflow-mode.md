# Step 24: Semi-autonomous Workflow Mode — AI CLI Code Execution

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
- docs/SECURITY.md

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

Implement Step 24: Semi-autonomous Workflow Mode — AI CLI Code Execution.

## Background

The docs define Semi-autonomous Mode (PRD §12.3, Workflow §5.3) as: the product runs one selected AI coding CLI after user approval, collects changed files, generates diff, and prepares for review.

This step builds on:
- Step 18 (AI-powered agents via CLI tools) — agents generate requirement, design, tasks using user's AI CLI
- Step 19 (Assisted mode) — for the implementation prompt structure
- Step 20 (Approval gates) — for code generation approval (Gate 3)
- Step 23 (AI CLI adapters) — for executing Claude Code / Codex CLI

The flow is:
1. Run docs agents → generate requirement, design, tasks, tests
2. Generate implementation prompt (Developer Agent)
3. User approves code generation (Gate 3: CODE_GENERATION)
4. Save git snapshot
5. Run selected AI CLI with the implementation prompt
6. Collect changed files
7. Generate diff patch
8. Save agent logs
9. Run Reporter Agent to update final report with code changes

This step does NOT include test runner, review engine, or fix loop. Those come in future steps.

## Tasks

### 1. Create semiAutoWorkflow

Create `packages/core/src/workflows/semiAutoWorkflow.ts`:

```typescript
export interface SemiAutoWorkflowInput {
  requirement: string;
  projectRoot: string;
  selectedAgent: AiAdapterName;
  approvalConfig?: {
    requireCodeApproval: boolean;
  };
}

export interface SemiAutoWorkflowOutput {
  runId: string;
  status: string;
  artifacts: string[];
  codeGenerationResult?: {
    success: boolean;
    changedFiles: string[];
    diffPatchPath: string;
    agentLogPath: string;
  };
}
```

Flow:
1. Run all docs agents (same as docs-only) → generate req, design, tasks, tests
2. Run Developer Agent → generate implementation prompt
3. Save implementation prompt as artifact
4. If approval required, create CODE_GENERATION gate, return pending
5. On approval: save git snapshot
6. Execute AI CLI adapter with implementation prompt
7. Collect changed files via git diff
8. Generate diff patch
9. Run Reporter Agent with code results
10. Return completed result

### 2. Create implementation artifact paths

Update `packages/core/src/artifacts/artifactWriter.ts`:

Add to `ArtifactPaths`:
```typescript
implementationDir: string;
implementationPromptPath: string;
agentLogPath: string;
diffPatchPath: string;
changedFilesPath: string;
```

### 3. Update workflow runner for code execution

The code execution phase should:
1. Save git pre-run state (branch, current diff)
2. Write implementation prompt to file
3. Construct AI CLI command from adapter config
4. Run with timeout
5. Stream output to agent log file
6. After completion, run `git diff` to collect changed files
7. Generate `diff.patch`
8. Generate `changed-files.json`
9. Check for protected file modifications (warn/block as per config)
10. Save all to implementation directory

### 4. Add code approval gate

Wire Gate 3 (CODE_GENERATION) from the approval gates system (Step 20).

Before running AI CLI:
1. Check config: `requireApprovalBeforeCode`
2. If true, create CODE_GENERATION approval with status PENDING
3. Show to user in CLI: what agent will run, what files may be affected, timeout
4. In web UI: show approval modal with prompt preview, agent info
5. Wait for approval via `codeclaw approve` or web UI
6. On approval, proceed with code execution

### 5. Add protected file detection

Create `packages/core/src/policies/safetyPolicy.ts`:

```typescript
export interface SafetyPolicy {
  denyFiles: string[];   // Glob patterns
  warnFiles: string[];   // Glob patterns
  denyCommands: string[];
  maxIterations: number;
  commandTimeoutSeconds: number;
}

export function checkFileSafety(
  changedFiles: string[],
  policy: SafetyPolicy,
): { blocked: string[]; warnings: string[]; safe: string[] }
```

Load safety config from project config.

### 6. Integrate with existing config

Add safety defaults to `packages/shared/src/schemas/config.schema.ts`:

```typescript
safety: {
  requireApprovalBeforeCode: true;
  requireApprovalBeforeCommit: true;
  maxIterations: 3;
  commandTimeoutSeconds: 900;
  denyFiles: [".env", ".env.*", "*.pem", "*.key", "credentials.json"];
  warnFiles: ["pom.xml", "build.gradle", "package.json", "Dockerfile"];
  denyCommands: ["sudo", "rm -rf /", "chmod 777", "curl | sh", "wget | sh"];
}
```

### 7. Wire semi-auto mode in CLI

Update `apps/cli/src/commands/run.ts`:

```bash
codeclaw run "..." --mode semi-auto --agent claude
```

Options:
- `--mode semi-auto`
- `--agent <name>` — Claude, Codex, Gemini, Aider
- `--approve` — Auto-approve code generation if safety allows
- `--timeout <seconds>` — Override command timeout

### 8. Add implementation tab in web UI

Update `apps/local-web/src/pages/RunDetail.tsx`:

After code execution, show in Implementation tab:
- Implementation prompt (Markdown viewer + Copy)
- Selected agent info
- Agent output log (scrollable text viewer)
- Changed files table (file, status, risk level)
- Diff viewer (basic: show patch content)
- Protected file warnings if any

### 9. Add diff preview in web UI

Add a basic diff viewer component `apps/local-web/src/components/DiffViewer.tsx`:

```typescript
interface DiffViewerProps {
  diffContent: string;  // Unified diff text
  fileName?: string;
}
```

Show add lines in green, removed lines in red, unchanged in gray.

### 10. Wire code execution API

Update `packages/server/src/routes/runs.routes.ts`:

```typescript
// POST /api/runs/:id/code — Trigger code execution
// Body: { agent: string, approved?: boolean }
// GET /api/runs/:id/diff — Get diff patch content
// GET /api/runs/:id/changed-files — Get changed files list
// GET /api/runs/:id/implementation-prompt — Get prompt
// GET /api/runs/:id/agent-log — Get agent output log
```

### 11. Update config schema for agent settings

AI CLI config in config.json (defaults):

```json
{
  "cli": {
    "claude": { "enabled": true, "command": "claude" },
    "codex": { "enabled": false, "command": "codex" },
    "gemini": { "enabled": false, "command": "gemini" },
    "aider": { "enabled": false, "command": "aider" }
  }
}
```

### 12. Update doctor to check selected agent

When running `codeclaw doctor`:
- If run has a selected agent, check that agent is available
- If default developer agent is set in config, check availability

### 13. Add tests

- Test semiAutoWorkflow with mock adapter
- Test code approval gate
- Test protected file detection
- Test git snapshot and diff collection
- Test that workflow fails gracefully when AI CLI is not available
- Test timeout handling

## Acceptance Criteria

- `codeclaw run "..." --mode semi-auto --agent claude` works end-to-end
- Implementation prompt is generated from all prior artifacts
- User must approve code generation before AI CLI runs (unless --approve)
- Git snapshot is saved before AI CLI runs
- AI CLI executes with the implementation prompt
- Changed files are detected and saved
- Diff patch is generated
- Agent log is saved
- Protected file modifications are detected and blocked/warned
- Final report includes code execution summary
- Web UI shows Implementation tab with prompt, log, changed files, diff
- All existing tests pass

## Files to Create

- `packages/core/src/workflows/semiAutoWorkflow.ts`
- `packages/core/src/policies/safetyPolicy.ts`
- `apps/local-web/src/components/DiffViewer.tsx`

## Files to Modify

- `packages/core/src/index.ts`
- `packages/core/src/artifacts/artifactWriter.ts`
- `packages/shared/src/schemas/config.schema.ts`
- `packages/shared/src/types/domain.ts`
- `packages/shared/src/index.ts`
- `apps/cli/src/commands/run.ts`
- `apps/cli/src/index.ts`
- `apps/local-web/src/pages/RunDetail.tsx`
- `apps/local-web/src/lib/types.ts`
- `apps/local-web/src/lib/api.ts`
- `packages/server/src/routes/runs.routes.ts`

## Rules

Implement only this step.
Do not implement future roadmap steps.
Do NOT run AI CLI automatically — always require user approval.
Do NOT auto-commit, auto-push, or auto-merge.
Do NOT add test runner, review engine, or fix loop yet.
Do not add cloud backend.
Do not add login.
Do not add billing.
Do not add desktop app.
Do not add Jira/Slack/GitHub integration.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
