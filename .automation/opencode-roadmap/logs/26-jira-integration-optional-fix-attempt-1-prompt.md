## Mandatory Fix Documentation Context

This fix attempt is a new  session.

Do not rely on memory from previous OpenCode runs.

Before fixing, read these files once for this session if they exist:

- /docs folder
- the current step prompt
- the quality log

After reading these once in this same fix session, do not reread them unless needed.

Fix only the quality issues shown in the quality log.

Rules:
- Do not implement unrelated features.
- Do not skip quality checks by weakening scripts.
- Do not remove tests to make quality pass.
- Do not bypass lint/typecheck/build.
- Keep changes minimal.
- Preserve the intended architecture.
- Do not make optional integrations required.
- Do not add cloud backend.
- Do not add login.
- Do not add billing.
- Do not add desktop app.
- After fixing, summarize docs read and what changed.

Failed step:
26-jira-integration-optional

Quality command:
pnpm quality

Quality log:
```
apps/cli test: 🎉 codeclaw initialized successfully!
apps/cli test:  ❯ src/index.test.ts (22 tests | 5 failed) 26466ms
apps/cli test:    ✓ initCommand > creates .codeclaw with all required files 33ms
apps/cli test:    ✓ initCommand > creates valid config.json 24ms
apps/cli test:    ✓ initCommand > applies --type option to config 29ms
apps/cli test:    ✓ initCommand > applies --output-language option to config 21ms
apps/cli test:    ✓ initCommand > refuses to overwrite without --force 22ms
apps/cli test:    ✓ initCommand > overwrites with --force 38ms
apps/cli test:    ✓ doctorCommand > fails when .codeclaw does not exist 1ms
apps/cli test:    ✓ doctorCommand > passes when .codeclaw is properly initialized  1027ms
apps/cli test:    ✓ runCommand > fails when .codeclaw does not exist 15ms
apps/cli test:    × runCommand > runs docs-only workflow and saves to database 5022ms
apps/cli test:      → Test timed out in 5000ms.
apps/cli test: If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
apps/cli test:    × runCommand > outputs JSON when --json flag is set 5021ms
apps/cli test:      → Test timed out in 5000ms.
apps/cli test: If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
apps/cli test:    × runCommand > uses custom title when --title is provided 5022ms
apps/cli test:      → Test timed out in 5000ms.
apps/cli test: If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
apps/cli test:    ✓ listCommand > shows no runs message when empty 18ms
apps/cli test:    × listCommand > shows runs after executing a workflow 5014ms
apps/cli test:      → Test timed out in 5000ms.
apps/cli test: If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
apps/cli test:    ✓ listCommand > fails when .codeclaw does not exist 18ms
apps/cli test:    ✓ showCommand > fails when run does not exist 10ms
apps/cli test:    × showCommand > shows run details after executing a workflow 5014ms
apps/cli test:      → Test timed out in 5000ms.
apps/cli test: If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
apps/cli test:    ✓ showCommand > fails when .codeclaw does not exist 18ms
apps/cli test:    ✓ uiCommand > fails when .codeclaw does not exist 1ms
apps/cli test:    ✓ uiCommand > starts server and prints URL 61ms
apps/cli test:    ✓ uiCommand > uses custom port option 14ms
apps/cli test:    ✓ uiCommand > reports error when port is already in use 15ms
apps/cli test: ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
apps/cli test:  FAIL  src/index.test.ts > runCommand > runs docs-only workflow and saves to database
apps/cli test: Error: Test timed out in 5000ms.
apps/cli test: If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
apps/cli test:  ❯ src/index.test.ts:167:3
apps/cli test:     165|   });
apps/cli test:     166| 
apps/cli test:     167|   it("runs docs-only workflow and saves to database", async () => {
apps/cli test:        |   ^
apps/cli test:     168|     await runCommand("Build a todo app", {});
apps/cli test:     169| 
apps/cli test: ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/5]⎯
apps/cli test:  FAIL  src/index.test.ts > runCommand > outputs JSON when --json flag is set
apps/cli test: Error: Test timed out in 5000ms.
apps/cli test: If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
apps/cli test:  ❯ src/index.test.ts:183:3
apps/cli test:     181|   });
apps/cli test:     182| 
apps/cli test:     183|   it("outputs JSON when --json flag is set", async () => {
apps/cli test:        |   ^
apps/cli test:     184|     const logs: string[] = [];
apps/cli test:     185|     const spy = vi.spyOn(console, "log").mockImplementation((...args: …
apps/cli test: ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/5]⎯
apps/cli test:  FAIL  src/index.test.ts > runCommand > uses custom title when --title is provided
apps/cli test: Error: Test timed out in 5000ms.
apps/cli test: If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
apps/cli test:  ❯ src/index.test.ts:202:3
apps/cli test:     200|   });
apps/cli test:     201| 
apps/cli test:     202|   it("uses custom title when --title is provided", async () => {
apps/cli test:        |   ^
apps/cli test:     203|     const logs: string[] = [];
apps/cli test:     204|     const spy = vi.spyOn(console, "log").mockImplementation((...args: …
apps/cli test: ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/5]⎯
apps/cli test:  FAIL  src/index.test.ts > listCommand > shows runs after executing a workflow
apps/cli test: Error: Test timed out in 5000ms.
apps/cli test: If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
apps/cli test:  ❯ src/index.test.ts:245:3
apps/cli test:     243|   });
apps/cli test:     244| 
apps/cli test:     245|   it("shows runs after executing a workflow", async () => {
apps/cli test:        |   ^
apps/cli test:     246|     await runCommand("Build a todo app", {});
apps/cli test:     247| 
apps/cli test: ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/5]⎯
apps/cli test:  FAIL  src/index.test.ts > showCommand > shows run details after executing a workflow
apps/cli test: Error: Test timed out in 5000ms.
apps/cli test: If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
apps/cli test:  ❯ src/index.test.ts:301:3
apps/cli test:     299|   });
apps/cli test:     300| 
apps/cli test:     301|   it("shows run details after executing a workflow", async () => {
apps/cli test:        |   ^
apps/cli test:     302|     const logs: string[] = [];
apps/cli test:     303|     const runSpy = vi.spyOn(console, "log").mockImplementation((...arg…
apps/cli test: ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯
apps/cli test:  Test Files  1 failed (1)
apps/cli test:       Tests  5 failed | 17 passed (22)
apps/cli test:    Start at  16:07:34
apps/cli test:    Duration  27.64s (transform 386ms, setup 0ms, collect 720ms, tests 26.47s, environment 0ms, prepare 89ms)
apps/cli test: Failed
/Users/phamthanhhung/Desktop/MyProject/auto-code/apps/cli:
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @codeclaw/cli@0.0.0 test: `vitest run`
Exit status 1
[ELIFECYCLE] Test failed. See above for more details.
[ELIFECYCLE] Command failed with exit code 1.
```
