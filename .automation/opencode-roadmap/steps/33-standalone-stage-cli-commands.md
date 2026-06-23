# Step 33: Standalone Stage CLI Commands

Implement Step 33: Standalone Stage CLI Commands.

## Background

CLI Spec SS2.4 requires both full-run and step-by-step modes. Currently only `aiteam run` (full-run) exists. Users need standalone commands to run individual stages on an existing run.

Required stage commands (CLI Spec SS6.3, SS18-S28):
- `aiteam spec --run <runId>` — Generate requirement clarification
- `aiteam scope --run <runId>` — Generate scope (Step 32)
- `aiteam plan --run <runId>` — Generate technical design
- `aiteam tasks --run <runId>` — Generate task breakdown
- `aiteam tests --run <runId>` — Generate test matrix (plan, not execute)
- `aiteam code --run <runId>` — Generate implementation prompt or run code
- `aiteam report --run <runId>` — Generate final report

Already exist: `aiteam trace` (Step 22), `aiteam test` (Step 29), `aiteam review` (Step 30), `aiteam scope` (Step 32).

## Tasks

### 1. Create spec command

`apps/cli/src/commands/spec.ts`:
```bash
aiteam spec --run <runId> [--regenerate] [--output-language <lang>]
```
Runs BA Agent on existing run. Regenerates requirement artifacts.

### 2. Create plan command

`apps/cli/src/commands/plan.ts`:
```bash
aiteam plan --run <runId> [--regenerate] [--level simple|standard|detailed]
```
Runs Architect Agent. Regenerates design artifacts.

### 3. Create tasks command

`apps/cli/src/commands/tasks.ts`:
```bash
aiteam tasks --run <runId> [--regenerate] [--format markdown|json|jira]
```
Runs PM Agent. Regenerates task breakdown.

### 4. Create tests-plan command

`apps/cli/src/commands/tests-plan.ts`:
```bash
aiteam tests --run <runId> [--regenerate] [--type unit|integration|manual|all]
```
Runs QA Agent. Generates test matrix (plan only, not execution).

Note: named `tests` to distinguish from `test` (execution). This matches CLI Spec SS41.1.

### 5. Create code command

`apps/cli/src/commands/code.ts`:
```bash
aiteam code --run <runId> [--agent claude] [--prompt-only] [--approve] [--dry-run]
```
Runs Developer Agent. Generates implementation prompt. With `--agent`, triggers semi-auto code execution.

### 6. Create report command

`apps/cli/src/commands/report.ts`:
```bash
aiteam report --run <runId> [--regenerate] [--include-logs] [--format markdown|json]
```
Runs Reporter Agent. Regenerates final report.

### 7. Create new command

`apps/cli/src/commands/new.ts`:
```bash
aiteam new "raw requirement" [--title <title>] [--mode docs-only]
```
Creates a new run but does NOT execute stages. Prints:
```
New run created: run_20260623_120000
Next: aiteam spec --run run_20260623_120000
```

### 8. Register all in CLI entry

All commands must validate the run exists and stages can be re-run independently.

## Acceptance Criteria

- `aiteam spec/scope/plan/tasks/tests/code/report --run <runId>` each run their respective agent
- `aiteam new` creates run without executing
- Commands respect `--regenerate` flag
- Stage commands validate run exists
- All work in both step-by-step and full-run modes
