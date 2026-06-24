# Step 33: Standalone Stage CLI Commands

Implement Step 33: Standalone Stage CLI Commands.

## Background

CLI Spec SS2.4 requires both full-run and step-by-step modes. Currently only `codeclaw run` (full-run) exists. Users need standalone commands to run individual stages on an existing run.

Required stage commands (CLI Spec SS6.3, SS18-S28):
- `codeclaw spec --run <runId>` — Generate requirement clarification
- `codeclaw scope --run <runId>` — Generate scope (Step 32)
- `codeclaw plan --run <runId>` — Generate technical design
- `codeclaw tasks --run <runId>` — Generate task breakdown
- `codeclaw tests --run <runId>` — Generate test matrix (plan, not execute)
- `codeclaw code --run <runId>` — Generate implementation prompt or run code
- `codeclaw report --run <runId>` — Generate final report

Already exist: `codeclaw trace` (Step 22), `codeclaw test` (Step 29), `codeclaw review` (Step 30), `codeclaw scope` (Step 32).

## Tasks

### 1. Create spec command

`apps/cli/src/commands/spec.ts`:
```bash
codeclaw spec --run <runId> [--regenerate] [--output-language <lang>]
```
Runs BA Agent on existing run. Regenerates requirement artifacts.

### 2. Create plan command

`apps/cli/src/commands/plan.ts`:
```bash
codeclaw plan --run <runId> [--regenerate] [--level simple|standard|detailed]
```
Runs Architect Agent. Regenerates design artifacts.

### 3. Create tasks command

`apps/cli/src/commands/tasks.ts`:
```bash
codeclaw tasks --run <runId> [--regenerate] [--format markdown|json|jira]
```
Runs PM Agent. Regenerates task breakdown.

### 4. Create tests-plan command

`apps/cli/src/commands/tests-plan.ts`:
```bash
codeclaw tests --run <runId> [--regenerate] [--type unit|integration|manual|all]
```
Runs QA Agent. Generates test matrix (plan only, not execution).

Note: named `tests` to distinguish from `test` (execution). This matches CLI Spec SS41.1.

### 5. Create code command

`apps/cli/src/commands/code.ts`:
```bash
codeclaw code --run <runId> [--agent claude] [--prompt-only] [--approve] [--dry-run]
```
Runs Developer Agent. Generates implementation prompt. With `--agent`, triggers semi-auto code execution.

### 6. Create report command

`apps/cli/src/commands/report.ts`:
```bash
codeclaw report --run <runId> [--regenerate] [--include-logs] [--format markdown|json]
```
Runs Reporter Agent. Regenerates final report.

### 7. Create new command

`apps/cli/src/commands/new.ts`:
```bash
codeclaw new "raw requirement" [--title <title>] [--mode docs-only]
```
Creates a new run but does NOT execute stages. Prints:
```
New run created: run_20260623_120000
Next: codeclaw spec --run run_20260623_120000
```

### 8. Register all in CLI entry

All commands must validate the run exists and stages can be re-run independently.

## Acceptance Criteria

- `codeclaw spec/scope/plan/tasks/tests/code/report --run <runId>` each run their respective agent
- `codeclaw new` creates run without executing
- Commands respect `--regenerate` flag
- Stage commands validate run exists
- All work in both step-by-step and full-run modes
