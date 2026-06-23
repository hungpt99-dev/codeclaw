# Step 23: AI CLI Adapter Layer

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

- docs/TECHNICAL_DESIGN.md
- docs/CLI_COMMAND_SPEC.md
- docs/WORKFLOW_DESIGN.md
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

Implement Step 23: AI CLI Adapter Layer.

## Background

The docs define an AI CLI adapter layer (Technical §16, CLI Spec §24) that coordinates existing AI coding tools. The adapter interface is:

```typescript
interface AiCliAdapter {
  name: string;
  isAvailable(): Promise<boolean>;
  runTask(input: AiTaskInput): Promise<AiTaskResult>;
}
```

Currently `packages/adapters/src/index.ts` is a 3-line stub: `{ connect: () => "connected" }`.

**Relationship to Step 18:** Step 18 built a simple prompt runner (`agentPromptRunner.ts`) that pipes agent prompt templates through `claude --print` (or similar) to generate document output. It uses `execa` directly for that purpose.

This step builds the **production-grade adapter layer** needed for code execution — shell runner with streaming/timeout/logging, git snapshot/diff, changed file detection, and structured adapter implementations for Claude Code and Codex CLI. This infrastructure is used by the Semi-autonomous Workflow (Step 24) to run AI coding agents for actual implementation.

**Key difference:** Step 18's prompt runner is for generating text output from agents (BA, Architect, etc.). This step's adapters are for executing code changes in the user's project.

This step does NOT wire the adapters into a workflow yet. That comes in Step 24 (Semi-autonomous Workflow). This step builds the infrastructure.

## Tasks

### 1. Add AI CLI adapter types to shared

In `packages/shared/src/types/domain.ts`:

```typescript
export type AiAdapterName = "claude" | "codex" | "gemini" | "aider";

export interface AiAdapterConfig {
  enabled: boolean;
  command: string;
  timeoutSeconds: number;
}

export interface AiTaskInput {
  role: string;
  prompt: string;
  workingDir: string;
  contextFiles?: string[];
  outputLogPath: string;
  timeoutSeconds: number;
}

export interface AiTaskResult {
  success: boolean;
  exitCode: number | null;
  outputLogPath: string;
  changedFiles: string[];
  error?: string;
}
```

### 2. Create shell runner

Create `packages/adapters/src/shell/shellRunner.ts`:

```typescript
export interface ShellRunInput {
  command: string;
  args: string[];
  cwd: string;
  timeoutSeconds: number;
  stdoutPath: string;
  stderrPath: string;
  env?: Record<string, string>;
}

export interface ShellRunResult {
  exitCode: number | null;
  stdoutPath: string;
  stderrPath: string;
  durationMs: number;
  timedOut: boolean;
}

export async function runShellCommand(input: ShellRunInput): Promise<ShellRunResult>
```

Implementation:
- Use `execa` for process execution
- Stream stdout/stderr to files
- Enforce timeout with AbortController
- Return exit code, duration, file paths
- Log command start/end (without secrets)

### 3. Create adapter interface

Create `packages/adapters/src/ai/aiCliAdapter.ts`:

```typescript
export interface AiCliAdapter {
  name: AiAdapterName;
  isAvailable(): Promise<boolean>;
  runTask(input: AiTaskInput): Promise<AiTaskResult>;
}
```

### 4. Implement Claude Code adapter

Create `packages/adapters/src/ai/adapters/claudeCodeAdapter.ts`:

```typescript
export function createClaudeCodeAdapter(): AiCliAdapter {
  return {
    name: "claude",
    async isAvailable(): Promise<boolean> {
      // Check if `claude` command is available
      // Try: which claude, npx claude --version
    },
    async runTask(input: AiTaskInput): Promise<AiTaskResult> {
      // 1. Write prompt to a temp file
      // 2. Run: claude -p <promptFile> --working-dir <workingDir>
      // 3. Collect stdout/stderr to log file
      // 4. Detect changed files via git diff
      // 5. Return result
    },
  };
}
```

Claude Code CLI flags to research:
- `claude -p "prompt"` — inline prompt
- `claude --print` — print response to stdout
- Working directory handling
- Timeout handling

### 5. Implement Codex CLI adapter

Create `packages/adapters/src/ai/adapters/codexAdapter.ts`:

Similar to Claude Code adapter but for Codex CLI commands.

### 6. Create git service

Create `packages/adapters/src/git/gitService.ts`:

```typescript
export async function getGitStatus(workingDir: string): Promise<{ clean: boolean; branch: string }>

export async function saveGitSnapshot(workingDir: string, snapshotPath: string): Promise<void>
// Save git diff and status before AI runs

export async function getChangedFiles(workingDir: string): Promise<string[]>
// Get list of files changed since last snapshot

export async function generateDiff(workingDir: string, outputPath: string): Promise<string>
// Generate diff patch file

export async function getDiffStats(workingDir: string): Promise<{ added: number; modified: number; deleted: number }>
```

Use `execa` to run git commands.

### 7. Create diff patch generation

Create `packages/adapters/src/diff/diffService.ts`:

```typescript
export interface DiffFile {
  filePath: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
}

export async function generateDiffPatch(
  workingDir: string,
  outputPatchPath: string,
): Promise<DiffFile[]>
```

### 8. Update adapter index

Update `packages/adapters/src/index.ts`:

```typescript
export { runShellCommand } from "./shell/shellRunner.js";
export type { ShellRunInput, ShellRunResult } from "./shell/shellRunner.js";
export { createClaudeCodeAdapter } from "./ai/adapters/claudeCodeAdapter.js";
export { createCodexAdapter } from "./ai/adapters/codexAdapter.js";
export type { AiCliAdapter } from "./ai/aiCliAdapter.js";
export { getGitStatus, saveGitSnapshot, getChangedFiles, generateDiff } from "./git/gitService.js";
```

### 9. Add adapter factory

Create `packages/adapters/src/ai/adapterFactory.ts`:

```typescript
export function createAdapter(name: AiAdapterName, config: AiAdapterConfig): AiCliAdapter | null
```

Returns null if adapter is disabled or unknown.

### 10. Update CLI doctor to check AI CLI availability

Update `apps/cli/src/commands/doctor.ts`:
- Check Claude Code availability: `which claude`
- Check Codex CLI availability
- Check Gemini CLI availability
- Check Aider availability
- Print status per tool

### 11. Add tests

- Test shell runner with mock commands
- Test git service with test repo
- Test adapter availability checks
- Test adapter factory
- Test diff generation with known changes

## Acceptance Criteria

- Shell runner executes commands, streams output, enforces timeout
- `isAvailable()` correctly detects if `claude` or `codex` commands exist
- Git snapshot saves current state before changes
- `getChangedFiles()` returns correct list after changes
- `generateDiff()` produces valid patch file
- `aiteam doctor` shows AI CLI availability
- Adapters are created via factory
- All existing tests pass

## Files to Create

- `packages/adapters/src/ai/aiCliAdapter.ts`
- `packages/adapters/src/ai/adapterFactory.ts`
- `packages/adapters/src/ai/adapters/claudeCodeAdapter.ts`
- `packages/adapters/src/ai/adapters/codexAdapter.ts`
- `packages/adapters/src/shell/shellRunner.ts`
- `packages/adapters/src/git/gitService.ts`
- `packages/adapters/src/diff/diffService.ts`

## Files to Modify

- `packages/shared/src/types/domain.ts`
- `packages/shared/src/index.ts`
- `packages/adapters/src/index.ts`
- `packages/adapters/package.json` (add execa dependency)
- `apps/cli/src/commands/doctor.ts`
- `apps/cli/src/commands/init.ts` (add AI CLI config defaults)

## Rules

Implement only this step.
Do not wire adapters into workflows yet.
Do not implement semi-autonomous workflow mode yet.
Do not add cloud backend.
Do not add login.
Do not add billing.
Do not add desktop app.
Do not add Jira/Slack/GitHub integration.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
