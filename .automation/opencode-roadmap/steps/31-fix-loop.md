# Step 31: Fix Loop — Iterative Fix-Test-Review Cycle

Implement Step 31: Fix Loop.

## Background

Workflow Design SS7.13 defines Stage 13: Fix Loop. When tests or review fail, the system should:
1. QA/Reviewer summarizes the issue
2. Developer Agent receives fix prompt
3. AI CLI attempts fix
4. Tests run again
5. Review runs again
6. Stop when passed or max iterations reached

Without this, semi-auto mode either succeeds or fails permanently. The fix loop makes it practical.

## Tasks

### 1. Create fix loop service

Create `packages/core/src/workflows/fixLoop.ts`:

```typescript
export interface FixLoopConfig {
  maxIterations: number;        // Default: 3
  testCommands: TestCommand[];
  aiTool: { tool: string; command: string; timeoutSeconds: number };
}

export interface FixLoopIteration {
  iteration: number;
  fixPrompt: string;
  testResult: TestRunResult;
  reviewResult?: ReviewOutput;
  gitDiff: string;
  passed: boolean;
}

export interface FixLoopResult {
  iterations: FixLoopIteration[];
  finalStatus: "PASSED" | "FAILED" | "MAX_ITERATIONS_REACHED";
  totalDurationMs: number;
}

export async function runFixLoop(
  runId: string,
  config: FixLoopConfig,
): Promise<FixLoopResult>
```

Flow per iteration:
1. Analyze test failures + review findings
2. Generate fix prompt summarizing what needs fixing
3. Run AI CLI with fix prompt (reuse Step 18's agent prompt runner)
4. Collect git diff of changes
5. Run tests again
6. Run review again
7. If passed → stop
8. If failed & iterations < max → loop
9. If max iterations → stop with MAX_ITERATIONS_REACHED

### 2. Create fix prompt generator

Create `packages/core/src/workflows/fixPromptGenerator.ts`:

```typescript
export function generateFixPrompt(
  iteration: number,
  previousDiff: string,
  testFailures: ParsedTestFailure[],
  reviewFindings: string,
  originalPrompt: string,
): string
```

Template:
```
Iteration {n} fix for: {runTitle}

Previous changes made:
{previousDiff}

Test failures to fix:
{testFailures}

Review findings to address:
{reviewFindings}

Original implementation prompt:
{originalPrompt}

Fix only the issues listed above. Do not make unrelated changes.
Run tests after fixing to confirm.
```

### 3. Add fix loop artifacts

Update `packages/core/src/artifacts/artifactWriter.ts`:

```typescript
fixLoopDir: string;          // implementation/fix-loop/
fixPromptPath: string;       // implementation/fix-loop/fix-prompt-{n}.md
fixDiffPath: string;         // implementation/fix-loop/diff-{n}.patch
fixIterationSummary: string; // implementation/fix-loop/iteration-summary.md
```

### 4. Wire fix loop into semi-auto workflow

Update `packages/core/src/workflows/semiAutoWorkflow.ts`:

After review:
1. If review status is APPROVED → done
2. If review status is CHANGES_REQUIRED → run fix loop
3. If max iterations reached → set status and report

Add config options:
- `--max-iterations <n>` — Override default
- `--no-fix-loop` — Skip fix loop, stop on failure

### 5. Add fix loop config to settings

Config defaults:
```json
{
  "safety": {
    "maxIterations": 3
  }
}
```

### 6. Show fix loop in web UI

In RunDetail, after review:
- Show fix loop timeline (Iteration 1, 2, 3)
- Each iteration shows: fix prompt, diff, test result, review result
- Show final status: PASSED, FAILED, MAX_ITERATIONS_REACHED

### 7. Add tests

- Test fix loop with mock AI CLI
- Test fix prompt generation
- Test iteration counting and max iteration enforcement

## Acceptance Criteria

- Fix loop runs when tests or review fail after code generation
- Each iteration generates fix prompt, applies fix, runs tests, reviews
- Loop stops when tests pass and review approves
- Loop stops after max iterations with clear status
- Fix loop artifacts saved per iteration
- All existing tests pass
