# Step 29: Test Runner — `codeclaw test`

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

- docs/TECHNICAL_DESIGN.md (SS21 Test Runner)
- docs/CLI_COMMAND_SPEC.md (SS25 codeclaw test)
- docs/PRD.md (SS13.9 Test Runner)
- docs/WORKFLOW_DESIGN.md (SS7.11 Stage 11)

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

Implement Step 29: Test Runner — `codeclaw test`.

## Background

The docs define a Test Runner (Technical SS21, CLI Spec SS25, Workflow SS7.11) that runs configured test/build commands after code generation. This is Stage 11 in the standard workflow, directly after code execution and before review.

Without a test runner, the semi-autonomous workflow (Step 24) generates code but cannot validate it. The Review Engine (next step) and Fix Loop (step after) both depend on test results.

The test runner must:
- Execute configured commands (build, unit test, integration test, lint)
- Capture stdout/stderr to log files
- Detect pass/fail from exit codes
- Parse test output to identify specific failures
- Generate `test-result.md` and `failed-tests.md` artifacts

## Tasks

### 1. Create test runner service

Create `packages/adapters/src/test/testRunner.ts`:

```typescript
export interface TestCommand {
  name: string;           // "build", "unitTest", "integrationTest", "lint"
  command: string;        // "mvn test", "npm test"
  cwd: string;
  timeoutSeconds: number;
}

export interface TestResult {
  commandName: string;
  command: string;
  exitCode: number | null;
  passed: boolean;
  durationMs: number;
  timedOut: boolean;
  stdoutPath: string;
  stderrPath: string;
  failureSummary?: string;
}

export interface TestRunResult {
  overallStatus: "PASSED" | "FAILED" | "TIMEOUT" | "SKIPPED";
  results: TestResult[];
  startedAt: string;
  completedAt: string;
}

export async function runTests(
  commands: TestCommand[],
  logDir: string,
): Promise<TestRunResult>
```

Implementation:
- Reuse the shell runner from Step 23 (or build a minimal version if step isn't done)
- Run each command sequentially
- Capture stdout/stderr to files in logDir
- Check exit code: 0 = pass, non-zero = fail
- Detect timeout
- Generate failure summary by scanning output for common patterns (e.g., "FAILED", "ERROR", "Tests run: X, Failures: Y")
- Return aggregate result

### 2. Create test output parser

Create `packages/adapters/src/test/testOutputParser.ts`:

```typescript
export interface ParsedTestFailure {
  testName: string;
  suiteName?: string;
  message: string;
  file?: string;
  line?: number;
}

export function parseMavenOutput(output: string): ParsedTestFailure[]
export function parseNpmOutput(output: string): ParsedTestFailure[]
export function parseGenericOutput(output: string): ParsedTestFailure[]
```

Parse patterns:
- Maven: `Tests run: X, Failures: Y` / `FAILURE!` / `<<< FAILURE!`
- npm/Jest: `FAIL` / `● test name` / `expect(received).toBe(expected)`
- Gradle: `FAILED` / `> Task :test FAILED`
- Generic: scan for common error patterns

### 3. Create test result artifact generator

Create `packages/adapters/src/test/testResultWriter.ts`:

```typescript
export async function writeTestResultArtifacts(
  result: TestRunResult,
  testDir: string,
): Promise<{ testResultPath: string; failedTestsPath: string }>
```

Generate:

**test-result.md:**
```markdown
# Test Result

## Summary
Status: FAILED

## Commands
### Build
Command: mvn clean package -DskipTests
Exit code: 0
Duration: 12.3s

### Unit Test
Command: mvn test
Exit code: 1
Duration: 45.2s

## Failed Tests
- PasswordResetServiceTest.shouldRejectExpiredOtp
  - File: src/test/java/.../PasswordResetServiceTest.java:42
  - Message: expected: <true> but was: <false>
```

**failed-tests.json:**
```json
{
  "overallStatus": "FAILED",
  "failedTests": [
    { "testName": "shouldRejectExpiredOtp", "suite": "PasswordResetServiceTest", "message": "..." }
  ]
}
```

### 4. Add test run config to settings

In `packages/shared/src/schemas/config.schema.ts`, the config should already have test commands. Verify:

```typescript
commands: {
  build: z.string().default("");
  unitTest: z.string().default("");
  integrationTest: z.string().default("");
  lint: z.string().default("");
}
```

### 5. Add test result types to shared

In `packages/shared/src/types/domain.ts`:

```typescript
export type TestStatus = "PASSED" | "FAILED" | "TIMEOUT" | "SKIPPED" | "NOT_RUN";

export interface TestCommandResult {
  name: string;
  command: string;
  exitCode: number | null;
  status: TestStatus;
  durationMs: number;
  stdoutPath: string;
  stderrPath: string;
}
```

### 6. Create CLI command: codeclaw test

Create `apps/cli/src/commands/test.ts`:

```bash
codeclaw test --run <runId>
codeclaw test --run <runId> --build
codeclaw test --run <runId> --unit
codeclaw test --run <runId> --integration
codeclaw test --run <runId> --lint
codeclaw test --run <runId> --all
codeclaw test --run <runId> --command "npm run custom"
```

Options:
- `--run <runId>` — Target run
- `--build` — Run build command only
- `--unit` — Run unit test command only
- `--integration` — Run integration test command only
- `--lint` — Run lint command only
- `--all` — Run all configured commands
- `--command <cmd>` — Run custom command

Behavior:
1. Load config for test commands
2. Resolve commands from config
3. Run each specified command
4. Save test result artifacts to run's tests/ directory
5. Update run metadata (test status)
6. Print summary

Register in CLI entry point.

### 7. Add test artifacts to artifact paths

Update `packages/core/src/artifacts/artifactWriter.ts`:

```typescript
testResultPath: string;    // tests/test-result.md
failedTestsPath: string;   // tests/failed-tests.md or failed-tests.json
```

### 8. Wire test execution into semi-auto workflow

Update `packages/core/src/workflows/semiAutoWorkflow.ts`:

After code execution completes:
1. Read test commands from config
2. Run tests using test runner
3. Save test results as artifacts
4. Update run status to TEST_PASSED or TEST_FAILED
5. Run reporter with test results

### 9. Show test results in web UI

In `apps/local-web/src/pages/RunDetail.tsx`:

In the "Tests" tab, add a "Test Execution" section:
- Show each command with: name, exit code, duration, pass/fail badge
- Show failed tests list with expandable details
- [Run Tests] button to trigger `codeclaw test` via API
- Link to test log files

### 10. Add test API routes

Update `packages/server/src/routes/runs.routes.ts`:

```typescript
// POST /api/runs/:id/test — Trigger test execution
// Body: { commands?: string[] }
// GET /api/runs/:id/test-result — Get test result artifacts
```

### 11. Add tests

- Test test runner with mock commands
- Test Maven output parsing
- Test Jest output parsing
- Test result artifact generation
- Test CLI command with mock
- Test error handling for missing commands

## Acceptance Criteria



- `codeclaw test --run <runId> --all` runs configured test commands and saves results
- Test result artifacts (`test-result.md`, `failed-tests.json`) are generated
- Maven and npm/Jest output are parsed for failure details
- Web UI shows test execution section with pass/fail per command
- Semi-auto workflow runs tests automatically after code generation
- Commands not configured are skipped gracefully
- Non-zero exit codes correctly reported as failures
- All existing tests pass

## Files to Create



- `packages/adapters/src/test/testRunner.ts`
- `packages/adapters/src/test/testOutputParser.ts`
- `packages/adapters/src/test/testResultWriter.ts`
- `apps/cli/src/commands/test.ts`

## Files to Modify



- `packages/shared/src/types/domain.ts`
- `packages/shared/src/index.ts`
- `packages/adapters/src/index.ts`
- `packages/core/src/artifacts/artifactWriter.ts`
- `packages/core/src/workflows/semiAutoWorkflow.ts`
- `packages/core/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/local-web/src/pages/RunDetail.tsx`
- `apps/local-web/src/lib/api.ts`
- `apps/local-web/src/lib/types.ts`
- `packages/server/src/routes/runs.routes.ts`

## Rules



Implement only this step.
Do not implement future roadmap steps.
Do not add cloud backend.
Do not add login.
Do not add billing.
Do not add desktop app.
Do not add Jira/Slack/GitHub integration.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
