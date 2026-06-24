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
02-monorepo-structure

Quality command:
pnpm quality

Quality log:

```
$ pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm deps:check && pnpm codegraph:check
$ prettier --check .
Checking formatting...
[warn] .automation/opencode-roadmap/steps/02-monorepo-structure.md
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
[ELIFECYCLE] Command failed with exit code 1.
[ELIFECYCLE] Command failed with exit code 1.
```
