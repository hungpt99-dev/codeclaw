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
08-local-server-api

Quality command:
pnpm quality

Quality log:

```
apps/cli test: stdout | src/index.test.ts > listCommand > fails when .codeclaw does not exist
apps/cli test: ⚠️  Could not copy template: architect-agent.md
apps/cli test: stdout | src/index.test.ts > listCommand > fails when .codeclaw does not exist
apps/cli test: ⚠️  Could not copy template: pm-agent.md
apps/cli test: stdout | src/index.test.ts > listCommand > fails when .codeclaw does not exist
apps/cli test: ⚠️  Could not copy template: qa-agent.md
apps/cli test: stdout | src/index.test.ts > listCommand > fails when .codeclaw does not exist
apps/cli test: ⚠️  Could not copy template: reporter-agent.md
apps/cli test: ✅ Created .codeclaw/prompts/
apps/cli test: stdout | src/index.test.ts > listCommand > fails when .codeclaw does not exist
apps/cli test: ✅ Created .codeclaw/runs/
apps/cli test: stdout | src/index.test.ts > listCommand > fails when .codeclaw does not exist
apps/cli test: ✅ Created .codeclaw/memory/ (14 files created, 0 skipped)
apps/cli test: 🎉 codeclaw initialized successfully!
apps/cli test: stdout | src/index.test.ts > listCommand > fails when .codeclaw does not exist
apps/cli test: ❌ .codeclaw not found. Run 'codeclaw init' first.
apps/cli test: stdout | src/index.test.ts > showCommand > fails when run does not exist
apps/cli test: ✅ Created .codeclaw/config.json
apps/cli test: ✅ Created .codeclaw/database.sqlite
apps/cli test: stdout | src/index.test.ts > showCommand > fails when run does not exist
apps/cli test: ⚠️  Could not copy template: ba-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when run does not exist
apps/cli test: ⚠️  Could not copy template: architect-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when run does not exist
apps/cli test: ⚠️  Could not copy template: pm-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when run does not exist
apps/cli test: ⚠️  Could not copy template: qa-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when run does not exist
apps/cli test: ⚠️  Could not copy template: reporter-agent.md
apps/cli test: ✅ Created .codeclaw/prompts/
apps/cli test: stdout | src/index.test.ts > showCommand > fails when run does not exist
apps/cli test: ✅ Created .codeclaw/runs/
apps/cli test: stdout | src/index.test.ts > showCommand > fails when run does not exist
apps/cli test: ✅ Created .codeclaw/memory/ (14 files created, 0 skipped)
apps/cli test: 🎉 codeclaw initialized successfully!
apps/cli test: stdout | src/index.test.ts > showCommand > fails when run does not exist
apps/cli test: ❌ Run not found: nonexistent-run
apps/cli test: stdout | src/index.test.ts > showCommand > shows run details after executing a workflow
apps/cli test: ✅ Created .codeclaw/config.json
apps/cli test: ✅ Created .codeclaw/database.sqlite
apps/cli test: stdout | src/index.test.ts > showCommand > shows run details after executing a workflow
apps/cli test: ⚠️  Could not copy template: ba-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > shows run details after executing a workflow
apps/cli test: ⚠️  Could not copy template: architect-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > shows run details after executing a workflow
apps/cli test: ⚠️  Could not copy template: pm-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > shows run details after executing a workflow
apps/cli test: ⚠️  Could not copy template: qa-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > shows run details after executing a workflow
apps/cli test: ⚠️  Could not copy template: reporter-agent.md
apps/cli test: ✅ Created .codeclaw/prompts/
apps/cli test: stdout | src/index.test.ts > showCommand > shows run details after executing a workflow
apps/cli test: ✅ Created .codeclaw/runs/
apps/cli test: stdout | src/index.test.ts > showCommand > shows run details after executing a workflow
apps/cli test: ✅ Created .codeclaw/memory/ (14 files created, 0 skipped)
apps/cli test: 🎉 codeclaw initialized successfully!
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ✅ Created .codeclaw/config.json
apps/cli test: ✅ Created .codeclaw/database.sqlite
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ⚠️  Could not copy template: ba-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ⚠️  Could not copy template: architect-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ⚠️  Could not copy template: pm-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ⚠️  Could not copy template: qa-agent.md
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ⚠️  Could not copy template: reporter-agent.md
apps/cli test: ✅ Created .codeclaw/prompts/
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ✅ Created .codeclaw/runs/
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ✅ Created .codeclaw/memory/ (14 files created, 0 skipped)
apps/cli test: 🎉 codeclaw initialized successfully!
apps/cli test: stdout | src/index.test.ts > showCommand > fails when .codeclaw does not exist
apps/cli test: ❌ .codeclaw not found. Run 'codeclaw init' first.
apps/cli test:  ✓ src/index.test.ts (19 tests) 504ms
apps/cli test:  Test Files  1 passed (1)
apps/cli test:       Tests  19 passed (19)
apps/cli test:    Start at  10:35:56
apps/cli test:    Duration  1.11s (transform 162ms, setup 0ms, collect 277ms, tests 504ms, environment 0ms, prepare 63ms)
apps/cli test: Done
$ knip
$ pnpm codegraph:circular && pnpm arch:check
$ madge apps packages --extensions ts,tsx --circular
- Finding files
Processed 176 files (449ms) (3 warnings)

✔ No circular dependency found!

$ dependency-cruiser apps packages --config .dependency-cruiser.cjs

  error no-node-modules-in-web: apps/local-web/dist/packages/shared/src/utils/fs.js → fs/promises

x 1 dependency violations (1 errors, 0 warnings). 292 modules, 618 dependencies cruised.

[ELIFECYCLE] Command failed with exit code 1.
[ELIFECYCLE] Command failed with exit code 1.
[ELIFECYCLE] Command failed with exit code 1.
```
