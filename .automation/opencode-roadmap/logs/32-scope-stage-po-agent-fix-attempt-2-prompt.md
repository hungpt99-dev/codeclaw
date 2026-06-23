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
32-scope-stage-po-agent

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
packages/adapters lint$ eslint src --ext .ts
packages/storage lint$ eslint src --ext .ts
packages/storage lint: Done
packages/adapters lint: Done
packages/core lint$ eslint src --ext .ts
packages/memory lint$ eslint src --ext .ts
packages/memory lint: Done
packages/core lint: Done
packages/server lint$ eslint src --ext .ts
packages/server lint: Done
apps/cli lint$ eslint src --ext .ts
apps/local-server lint$ eslint src --ext .ts
apps/local-server lint: Done
apps/cli lint: /Users/phamthanhhung/Desktop/MyProject/auto-code/apps/cli/src/commands/scope.ts
apps/cli lint:   77:53  error  Unnecessary optional chain on a non-nullish value  @typescript-eslint/no-unnecessary-condition
apps/cli lint: ✖ 1 problem (1 error, 0 warnings)
apps/cli lint: Failed
/Users/phamthanhhung/Desktop/MyProject/auto-code/apps/cli:
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @aiteam/cli@0.0.0 lint: `eslint src --ext .ts`
Exit status 1
[ELIFECYCLE] Command failed with exit code 1.
[ELIFECYCLE] Command failed with exit code 1.
```
