The previous step failed quality checks.

You must fix the issues shown in the quality log.

Rules:

- Do not implement unrelated features.
- Do not skip quality checks by weakening scripts.
- Do not remove tests to make quality pass.
- Do not bypass lint/typecheck/build.
- Keep changes minimal.
- Preserve the intended architecture.
- After fixing, summarize what was changed.

Failed step:
04-storage-package

Quality command:
pnpm quality

Quality log:

```
$ pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm deps:check && pnpm codegraph:check
$ prettier --check .
Checking formatting...
[warn] packages/storage/src/db.test.ts
[warn] packages/storage/src/index.ts
[warn] packages/storage/src/repositories/artifactRepository.ts
[warn] packages/storage/src/repositories/runRepository.ts
[warn] packages/storage/src/repositories/settingRepository.ts
[warn] Code style issues found in 5 files. Run Prettier with --write to fix.
[ELIFECYCLE] Command failed with exit code 1.
[ELIFECYCLE] Command failed with exit code 1.
```
