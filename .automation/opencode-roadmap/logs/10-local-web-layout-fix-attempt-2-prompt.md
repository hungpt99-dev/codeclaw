## Mandatory Fix Documentation Context

This fix attempt is a new session.

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
10-local-web-layout

Quality command:
pnpm quality

Quality log:

```
apps/cli test: ⚠️  Could not copy template: reporter-agent.md
apps/cli test: ✅ Created .ai-team/prompts/
apps/cli test: stdout | src/index.test.ts > showCommand > shows run details after executing a workflow
apps/cli test: ✅ Created .ai-team/runs/
apps/cli test: stdout | src/index.test.ts > showCommand > shows run details after executing a workflow
apps/cli test: ✅ Created .ai-team/memory/ (14 files created, 0 skipped)
apps/cli test: 🎉 aiteam initialized successfully!
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .ai-team does not exist
apps/cli test: ✅ Created .ai-team/config.json
apps/cli test: ✅ Created .ai-team/database.sqlite
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .ai-team does not exist
apps/cli test: ⚠️  Could not copy template: ba-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .ai-team does not exist
apps/cli test: ⚠️  Could not copy template: architect-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .ai-team does not exist
apps/cli test: ⚠️  Could not copy template: pm-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .ai-team does not exist
apps/cli test: ⚠️  Could not copy template: qa-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .ai-team does not exist
apps/cli test: ⚠️  Could not copy template: reporter-agent.md
apps/cli test: ✅ Created .ai-team/prompts/
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .ai-team does not exist
apps/cli test: ✅ Created .ai-team/runs/
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .ai-team does not exist
apps/cli test: ✅ Created .ai-team/memory/ (14 files created, 0 skipped)
apps/cli test: 🎉 aiteam initialized successfully!
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .ai-team does not exist
apps/cli test: ❌ .ai-team not found. Run 'aiteam init' first.
apps/cli test: stderr | src/index.test.ts > uiCommand > fails when .ai-team does not exist
apps/cli test: Error: .ai-team directory not found. Run 'aiteam init' first.
apps/cli test: stdout | src/index.test.ts > uiCommand > starts server and prints URL
apps/cli test: ✅ Created .ai-team/config.json
apps/cli test: ✅ Created .ai-team/database.sqlite
apps/cli test: stdout | src/index.test.ts > uiCommand > starts server and prints URL
apps/cli test: ⚠️  Could not copy template: ba-agent.md
apps/cli test: stdout | src/index.test.ts > uiCommand > starts server and prints URL
apps/cli test: ⚠️  Could not copy template: architect-agent.md
apps/cli test: stdout | src/index.test.ts > uiCommand > starts server and prints URL
apps/cli test: ⚠️  Could not copy template: pm-agent.md
apps/cli test: stdout | src/index.test.ts > uiCommand > starts server and prints URL
apps/cli test: ⚠️  Could not copy template: qa-agent.md
apps/cli test: stdout | src/index.test.ts > uiCommand > starts server and prints URL
apps/cli test: ⚠️  Could not copy template: reporter-agent.md
apps/cli test: ✅ Created .ai-team/prompts/
apps/cli test: stdout | src/index.test.ts > uiCommand > starts server and prints URL
apps/cli test: ✅ Created .ai-team/runs/
apps/cli test: stdout | src/index.test.ts > uiCommand > starts server and prints URL
apps/cli test: ✅ Created .ai-team/memory/ (14 files created, 0 skipped)
apps/cli test: 🎉 aiteam initialized successfully!
apps/cli test: stdout | src/index.test.ts > uiCommand > uses custom port option
apps/cli test: ✅ Created .ai-team/config.json
apps/cli test: ✅ Created .ai-team/database.sqlite
apps/cli test: stdout | src/index.test.ts > uiCommand > uses custom port option
apps/cli test: ⚠️  Could not copy template: ba-agent.md
apps/cli test: stdout | src/index.test.ts > uiCommand > uses custom port option
apps/cli test: ⚠️  Could not copy template: architect-agent.md
apps/cli test: stdout | src/index.test.ts > uiCommand > uses custom port option
apps/cli test: ⚠️  Could not copy template: pm-agent.md
apps/cli test: stdout | src/index.test.ts > uiCommand > uses custom port option
apps/cli test: ⚠️  Could not copy template: qa-agent.md
apps/cli test: stdout | src/index.test.ts > uiCommand > uses custom port option
apps/cli test: ⚠️  Could not copy template: reporter-agent.md
apps/cli test: ✅ Created .ai-team/prompts/
apps/cli test: stdout | src/index.test.ts > uiCommand > uses custom port option
apps/cli test: ✅ Created .ai-team/runs/
apps/cli test: stdout | src/index.test.ts > uiCommand > uses custom port option
apps/cli test: ✅ Created .ai-team/memory/ (14 files created, 0 skipped)
apps/cli test: 🎉 aiteam initialized successfully!
apps/cli test: stdout | src/index.test.ts > uiCommand > reports error when port is already in use
apps/cli test: ✅ Created .ai-team/config.json
apps/cli test: ✅ Created .ai-team/database.sqlite
apps/cli test: stdout | src/index.test.ts > uiCommand > reports error when port is already in use
apps/cli test: ⚠️  Could not copy template: ba-agent.md
apps/cli test: stdout | src/index.test.ts > uiCommand > reports error when port is already in use
apps/cli test: ⚠️  Could not copy template: architect-agent.md
apps/cli test: stdout | src/index.test.ts > uiCommand > reports error when port is already in use
apps/cli test: ⚠️  Could not copy template: pm-agent.md
apps/cli test: stdout | src/index.test.ts > uiCommand > reports error when port is already in use
apps/cli test: ⚠️  Could not copy template: qa-agent.md
apps/cli test: stdout | src/index.test.ts > uiCommand > reports error when port is already in use
apps/cli test: ⚠️  Could not copy template: reporter-agent.md
apps/cli test: ✅ Created .ai-team/prompts/
apps/cli test: stdout | src/index.test.ts > uiCommand > reports error when port is already in use
apps/cli test: ✅ Created .ai-team/runs/
apps/cli test: stdout | src/index.test.ts > uiCommand > reports error when port is already in use
apps/cli test: ✅ Created .ai-team/memory/ (14 files created, 0 skipped)
apps/cli test: 🎉 aiteam initialized successfully!
apps/cli test:  ✓ src/index.test.ts (22 tests) 509ms
apps/cli test:  Test Files  1 passed (1)
apps/cli test:       Tests  22 passed (22)
apps/cli test:    Start at  12:26:46
apps/cli test:    Duration  1.16s (transform 146ms, setup 0ms, collect 275ms, tests 509ms, environment 0ms, prepare 64ms)
apps/cli test: Done
$ knip
Unused files (1)
apps/local-web/src/lib/api.ts
Unused dependencies (1)
@aiteam/shared  apps/local-web/package.json:17:6
[ELIFECYCLE] Command failed with exit code 1.
[ELIFECYCLE] Command failed with exit code 1.
```
