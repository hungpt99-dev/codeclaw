# Step 17: Fix Shared Package Barrel Export for Web Safety

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

- docs/ARCHITECTURE.md
- docs/TECHNICAL_DESIGN.md

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
- Do not add real AI calls.
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

Implement Step 17: Fix Shared Package Barrel Export for Web Safety.

## Background

`apps/local-web` currently cannot build because `packages/shared/src/index.ts` barrel-exports all utilities including `node:fs/promises` from `packages/shared/src/utils/fs.ts`. Vite cannot bundle Node built-in modules for the browser. The web app only needs `createRunId` and types from shared, but the barrel import pulls in everything.

This is a blocking issue for all subsequent web UI development.

## Tasks

Work mainly in `packages/shared`.

### 1. Split shared exports into web-safe and Node-safe

Create separate entry points:

- `packages/shared/src/index.ts` — Keep as-is but do NOT export Node-only utilities. Export only: types, schemas, `createRunId`, `slugify`, `nowIso`.
- `packages/shared/src/node.ts` — Export Node-only utilities: `ensureDir`, `fileExists`, and any future `node:fs`/`node:path` utilities.

### 2. Update `packages/shared/package.json` exports field

Add conditional exports so that:
- `@codeclaw/shared` resolves to the web-safe barrel
- `@codeclaw/shared/node` resolves to the Node-only barrel

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./node": {
      "import": "./dist/node.js",
      "types": "./dist/node.d.ts"
    }
  }
}
```

### 3. Update Node-only consumers

Update these packages that use Node-only utilities to import from `@codeclaw/shared/node` instead of `@codeclaw/shared`:

- `packages/core/src/artifacts/artifactWriter.ts` — uses `mkdir`, `writeFile` via `node:fs/promises` directly, not shared. Skip.
- `packages/core/src/agents/*.ts` — only use renderPrompt, no Node deps. Skip.
- `packages/core/src/index.ts` — only exports agent functions. Skip.
- `packages/storage/src/db.ts` — uses better-sqlite3 directly. Skip.
- `packages/memory/src/memoryPaths.ts` — uses `node:path` directly. Skip.
- `apps/cli/src/commands/init.ts` — uses `ensureDir` from shared. Update import to `@codeclaw/shared/node`.
- `apps/cli/src/commands/run.ts` — does not use shared fs utilities. Skip.
- `apps/cli/src/commands/doctor.ts` — does not use shared fs utilities. Skip.

### 4. Update `apps/local-web/src/lib/api.ts`

Current imports from `@codeclaw/shared`:
- Only uses types from shared (Run, Artifact, Setting, etc. are defined locally in `types.ts`)
- Verify no import from shared barrel; if found, replace with local type or `@codeclaw/shared`

### 5. Update `packages/shared/src/index.ts`

Remove these exports:
```typescript
export { ensureDir, fileExists } from "./utils/fs.js";
```

### 6. Create `packages/shared/src/node.ts`

```typescript
export { ensureDir, fileExists } from "./utils/fs.js";
```

### 7. Update dependent imports

Find all imports of `@codeclaw/shared` that use `ensureDir` or `fileExists` and update them to `@codeclaw/shared/node`.

Search:
```bash
rg "ensureDir|fileExists" apps packages --include '*.ts' --no-heading
```

Files likely affected:
- `apps/cli/src/commands/init.ts`
- Any test files using these functions

### 8. Run tests and build

```bash
pnpm build
pnpm test
pnpm typecheck
```

Verify that `apps/local-web` builds without errors.

## Acceptance Criteria

- `pnpm build` passes for all packages including `apps/local-web`
- `pnpm test` passes
- `pnpm typecheck` passes
- `apps/local-web` no longer imports Node-only modules from shared
- Web-safe apps import from `@codeclaw/shared` (default barrel)
- Node-only apps import from `@codeclaw/shared/node` when they need fs utilities
- No breaking changes to imports that don't use Node-only functions

## Files to Modify

- `packages/shared/src/index.ts`
- `packages/shared/src/node.ts` (new)
- `packages/shared/package.json`
- `apps/cli/src/commands/init.ts`
- Any other files importing `ensureDir` or `fileExists` from `@codeclaw/shared`

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
