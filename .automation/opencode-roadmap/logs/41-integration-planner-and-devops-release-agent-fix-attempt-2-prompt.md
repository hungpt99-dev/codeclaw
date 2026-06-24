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
41-integration-planner-and-devops-release-agent

Quality command:
pnpm quality

Quality log:
```
$ pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm deps:check && pnpm codegraph:check
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
$ pnpm -r lint
Scope: 9 of 10 workspace projects
apps/local-web lint$ eslint src --ext .ts,.tsx
packages/shared lint$ eslint src --ext .ts
packages/shared lint: Done
apps/local-web lint: Done
packages/storage lint$ eslint src --ext .ts
packages/adapters lint$ eslint src --ext .ts
packages/storage lint: Done
packages/adapters lint: Done
packages/core lint$ eslint src --ext .ts
packages/memory lint$ eslint src --ext .ts
packages/memory lint: Done
packages/core lint: /Users/phamthanhhung/Desktop/MyProject/auto-code/packages/core/src/workflows/semiAutoWorkflow.ts
packages/core lint:   16:10  error  'runDevopsReleaseAgent' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
packages/core lint: ✖ 1 problem (1 error, 0 warnings)
packages/core lint: Failed
/Users/phamthanhhung/Desktop/MyProject/auto-code/packages/core:
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @aiteam/core@0.0.0 lint: `eslint src --ext .ts`
Exit status 1
[ELIFECYCLE] Command failed with exit code 1.
[ELIFECYCLE] Command failed with exit code 1.
```
