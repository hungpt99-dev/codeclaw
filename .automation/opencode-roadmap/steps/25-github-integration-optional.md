# Step 25: GitHub Integration (Optional — via gh CLI)

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
- Do not add cloud backend.
- Do not add login.
- Do not add billing.
- Do not add desktop app.
- **Integration is OPTIONAL. The app must work without GitHub config.**
- **No GitHub token or API key is required. Use GitHub CLI (`gh`) only.**
- **Creating PRs requires user approval.**
- **The product must not auto-push, auto-commit, or auto-merge.**
- Do not bypass quality checks.
- Do not weaken scripts just to pass checks.
- Do not remove tests just to make checks pass.
- Keep changes minimal and focused.
- Prefer updating existing files over creating duplicates.
- At the end, summarize docs read, changed files, and commands run.

---

Implement Step 25: GitHub Integration (Optional — via gh CLI).

## Background

The docs (Technical §24.1, CLI Spec §35) define GitHub integration as optional. The product must work without it. The recommended approach is to use GitHub CLI (`gh`) which the user may already have installed and authenticated.

Features:
- `codeclaw github status` — Check gh CLI availability and auth status
- `codeclaw github test` — Test connection
- `codeclaw github pr create --run <runId>` — Generate PR summary + optionally create PR (requires approval)
- `codeclaw github pr view` — View PR details
- `codeclaw github actions` — Read CI status

**Key constraints:**
- Never auto-push or auto-merge
- PR creation requires explicit user approval (Gate 5: EXTERNAL_UPDATE)
- Uses `gh` CLI only — no GitHub API tokens stored in config

## Tasks

### 1. Add GitHub integration config to shared schema

In `packages/shared/src/schemas/config.schema.ts`:

```typescript
integrations: {
  github: {
    enabled: z.boolean().default(false);
    mode: z.enum(["gh-cli"]).default("gh-cli");
    owner: z.string().optional();
    repo: z.string().optional();
  };
}
```

Default: `enabled: false`. The app must work without touching this config.

### 2. Create GitHub adapter

Create `packages/adapters/src/integrations/gitHubAdapter.ts`:

```typescript
export interface GitHubConfig {
  enabled: boolean;
  owner?: string;
  repo?: string;
}

export interface PRSummaryInput {
  runId: string;
  title: string;
  body: string;
  baseBranch?: string;
}

export interface PRSummaryResult {
  success: boolean;
  prUrl?: string;
  error?: string;
}
```

Methods:

**`checkStatus()`** — Run `gh auth status` to verify:
- `gh` CLI is installed
- User is authenticated
- Current repo is a GitHub repo

**`generatePRSummary(runId, artifacts)`** — Generate PR description markdown from run artifacts:
- Title: based on run title
- Body: includes requirement summary, changed files, test results, review summary, traceability
- This is deterministic markdown generation, no API call

**`createPR(summary)`** — Only if user approves:
1. Check current branch
2. Run `gh pr create --title "<title>" --body "<body>" --base <branch>`
3. Capture PR URL
4. Return result

**`readCIRun()`** — Run `gh run list` to show CI status (basic)

### 3. Create GitHub CLI service

Create `packages/adapters/src/integrations/gitHubCliService.ts`:

```typescript
export async function isGhCliAvailable(): Promise<boolean>
// Run: which gh

export async function isGhAuthenticated(): Promise<boolean>
// Run: gh auth status, check exit code

export async function getCurrentRepo(): Promise<{ owner: string; repo: string } | null>
// Run: gh repo view --json name,owner

export async function createGhPR(
  title: string,
  body: string,
  options?: { base?: string; draft?: boolean },
): Promise<{ url: string; number: number }>
// Run: gh pr create --title <title> --body <body> [--base <base>] [--draft]

export async function getGhPRStatus(): Promise<{ state: string; title: string; url: string }[]>
// Run: gh pr list

export async function getCIRuns(): Promise<{ workflow: string; status: string; conclusion: string }[]>
// Run: gh run list --limit 5
```

Use `execa` for running gh commands.

### 4. Create PR summary generator

Create `packages/core/src/integrations/prSummaryGenerator.ts`:

```typescript
export async function generatePRSummary(
  runId: string,
  artifacts: ArtifactPaths,
  run: RunRecord,
): Promise<{ title: string; body: string }>
```

Logic:
- Title: `[CodeClaw] <run.title>`
- Body structure:
  ```markdown
  ## Summary
  <!-- Run title, mode, status -->
  
  ## Requirement
  <!-- Raw requirement, clarified requirement summary -->
  
  ## Changes
  - <!-- Changed files from semi-auto workflow -->
  
  ## Test Results
  - <!-- Pass/fail summary -->
  
  ## Review Status
  - <!-- Review report summary -->
  
  ## Traceability
  - Covered: X/Y requirements
  
  ## Generated by CodeClaw
  - Run ID: <runId>
  ```
- Read artifact files to populate sections
- If artifacts are missing (no code run), omit those sections

### 5. Create CLI command: codeclaw github

Create `apps/cli/src/commands/github.ts`:

```bash
codeclaw github status
codeclaw github test
codeclaw github pr create --run <runId> [--approve]
codeclaw github pr view
codeclaw github actions
```

Register in CLI entry point as a subcommand group:

```typescript
const githubProgram = program.command("github").description("GitHub integration (optional)");

githubProgram
  .command("status")
  .action(githubStatusCommand);

githubProgram
  .command("test")
  .action(githubTestCommand);

githubProgram
  .command("pr")
  .argument("<action>", "create or view")
  .option("--run <runId>", "Run ID")
  .option("--approve", "Skip approval")
  .action(githubPRCommand);

githubProgram
  .command("actions")
  .action(githubActionsCommand);
```

### 6. Add PR summary tab in web UI

In `apps/local-web/src/pages/RunDetail.tsx`:
- If GitHub integration is enabled, show a "GitHub" tab or section
- Show: connection status, PR summary preview, [Create PR] button with approval
- PR summary preview shows the markdown that will be used

### 7. Add approval gate for PR creation

Wire Gate 5 (EXTERNAL_UPDATE) from the approval gates system (Step 20):
- Before `gh pr create`, require user approval
- Show in approval modal: PR title, PR body preview, target branch
- Approval via `codeclaw approve --gate EXTERNAL_UPDATE` or web UI

### 8. Add GitHub settings in web UI

In `apps/local-web/src/pages/Settings.tsx`:
- GitHub integration toggle
- Status indicator (gh CLI available, authenticated)
- Repo owner/repo fields (optional, auto-detect)

### 9. Update doctor command

Update `apps/cli/src/commands/doctor.ts`:
- If GitHub integration is enabled, check gh CLI availability and auth
- Print status

### 10. Add tests

- Test gh CLI service with mock execa
- Test PR summary generation with sample artifacts
- Test status check with gh available/not available
- Test that all commands work gracefully when gh is not installed
- Test that PR creation requires approval

## Acceptance Criteria

- `codeclaw github status` shows gh CLI availability and auth status
- `codeclaw github test` verifies connection
- `codeclaw github pr create --run <runId>` generates PR summary and shows approval prompt
- PR is only created after user approval (or `--approve` flag)
- Web UI shows GitHub section when integration is enabled
- All commands work gracefully when gh CLI is not installed
- The app works COMPLETELY NORMAL without any GitHub config
- All existing tests pass

## Files to Create

- `packages/adapters/src/integrations/gitHubAdapter.ts`
- `packages/adapters/src/integrations/gitHubCliService.ts`
- `packages/core/src/integrations/prSummaryGenerator.ts`
- `apps/cli/src/commands/github.ts`

## Files to Modify

- `packages/shared/src/schemas/config.schema.ts`
- `packages/shared/src/types/domain.ts`
- `packages/shared/src/index.ts`
- `packages/adapters/src/index.ts`
- `packages/core/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/commands/doctor.ts`
- `apps/local-web/src/pages/RunDetail.tsx`
- `apps/local-web/src/pages/Settings.tsx`
- `apps/local-web/src/lib/api.ts`
- `apps/local-web/src/lib/types.ts`
- `packages/server/src/routes/runs.routes.ts`

## Rules

Implement only this step.
Integration is OPTIONAL. Zero config required. App must work without it.
Use GitHub CLI (`gh`) only. No API tokens in config.
Never auto-push or auto-merge. PR creation requires approval.
Do not add cloud backend.
Do not add login.
Do not add billing.
Do not add desktop app.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
