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
46-live-workflow-progress-in-web-ui

Quality command:
pnpm quality

Quality log:
```
$ pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm deps:check && pnpm codegraph:check
$ prettier --check .
Checking formatting...
[warn] apps/local-web/src/components/AgentActivityIndicator.tsx
[warn] apps/local-web/src/components/WorkflowTimeline.tsx
[warn] apps/local-web/src/pages/RunDetail.tsx
[warn] packages/core/src/workflows/assistedWorkflow.ts
[warn] packages/core/src/workflows/docsOnlyWorkflow.ts
[warn] packages/server/src/routes/runs.routes.ts
[warn] packages/shared/src/types/progress.ts
[warn] Code style issues found in 7 files. Run Prettier with --write to fix.
[ELIFECYCLE] Command failed with exit code 1.
[ELIFECYCLE] Command failed with exit code 1.
```
