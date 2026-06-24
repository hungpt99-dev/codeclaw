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
28-document-export-docx-pdf-html

Quality command:
pnpm quality

Quality log:
```
apps/cli test: ⚠️  Could not copy template: pm-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ⚠️  Could not copy template: qa-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ⚠️  Could not copy template: reporter-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ⚠️  Could not copy template: developer-agent.md
apps/cli test: ✅ Created .codeclaw/prompts/
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ✅ Created .codeclaw/runs/
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ✅ Created .codeclaw/memory/ (14 files created, 0 skipped)
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: 📋 No specific project type detected.
apps/cli test: 🎉 codeclaw initialized successfully!
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ❌ .codeclaw not found. Run 'codeclaw init' first.
apps/cli test: stdout | src/index.test.ts > uiCommand > fails when .codeclaw does not exist
apps/cli test: ❌ .codeclaw not found. Run 'codeclaw init' first.
apps/cli test: stdout | src/index.test.ts > uiCommand > starts server and prints URL
apps/cli test: ✅ Created .codeclaw/config.json
apps/cli test: ✅ Created .codeclaw/database.sqlite
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
apps/cli test: stdout | src/index.test.ts > uiCommand > starts server and prints URL
apps/cli test: ⚠️  Could not copy template: developer-agent.md
apps/cli test: ✅ Created .codeclaw/prompts/
apps/cli test: stdout | src/index.test.ts > uiCommand > starts server and prints URL
apps/cli test: ✅ Created .codeclaw/runs/
apps/cli test: stdout | src/index.test.ts > uiCommand > starts server and prints URL
apps/cli test: ✅ Created .codeclaw/memory/ (14 files created, 0 skipped)
apps/cli test: stdout | src/index.test.ts > uiCommand > starts server and prints URL
apps/cli test: 📋 No specific project type detected.
apps/cli test: 🎉 codeclaw initialized successfully!
apps/cli test: stdout | src/index.test.ts > uiCommand > uses custom port option
apps/cli test: ✅ Created .codeclaw/config.json
apps/cli test: ✅ Created .codeclaw/database.sqlite
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
apps/cli test: stdout | src/index.test.ts > uiCommand > uses custom port option
apps/cli test: ⚠️  Could not copy template: developer-agent.md
apps/cli test: ✅ Created .codeclaw/prompts/
apps/cli test: stdout | src/index.test.ts > uiCommand > uses custom port option
apps/cli test: ✅ Created .codeclaw/runs/
apps/cli test: stdout | src/index.test.ts > uiCommand > uses custom port option
apps/cli test: ✅ Created .codeclaw/memory/ (14 files created, 0 skipped)
apps/cli test: stdout | src/index.test.ts > uiCommand > uses custom port option
apps/cli test: 📋 No specific project type detected.
apps/cli test: 🎉 codeclaw initialized successfully!
apps/cli test: stdout | src/index.test.ts > uiCommand > reports error when port is already in use
apps/cli test: ✅ Created .codeclaw/config.json
apps/cli test: ✅ Created .codeclaw/database.sqlite
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
apps/cli test: stdout | src/index.test.ts > uiCommand > reports error when port is already in use
apps/cli test: ⚠️  Could not copy template: developer-agent.md
apps/cli test: ✅ Created .codeclaw/prompts/
apps/cli test: stdout | src/index.test.ts > uiCommand > reports error when port is already in use
apps/cli test: ✅ Created .codeclaw/runs/
apps/cli test: stdout | src/index.test.ts > uiCommand > reports error when port is already in use
apps/cli test: ✅ Created .codeclaw/memory/ (14 files created, 0 skipped)
apps/cli test: stdout | src/index.test.ts > uiCommand > reports error when port is already in use
apps/cli test: 📋 No specific project type detected.
apps/cli test: 🎉 codeclaw initialized successfully!
apps/cli test:  ✓ src/index.test.ts (22 tests) 4814ms
apps/cli test:    ✓ doctorCommand > passes when .codeclaw is properly initialized  4445ms
apps/cli test:  Test Files  1 passed (1)
apps/cli test:       Tests  22 passed (22)
apps/cli test:    Start at  21:52:52
apps/cli test:    Duration  5.48s (transform 199ms, setup 0ms, collect 366ms, tests 4.81s, environment 0ms, prepare 92ms)
apps/cli test: Done
$ knip
Unused exports (1)
collectFilesFromRun  function  packages/adapters/src/export/utils.ts:40:23
[ELIFECYCLE] Command failed with exit code 1.
[ELIFECYCLE] Command failed with exit code 1.
```
