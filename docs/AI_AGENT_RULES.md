# AI Agent Rules

These rules apply to all AI coding agents working on this repository.

## Must Follow

- Do not implement unrelated features.
- Do not modify generated lockfile unless dependency changes.
- Do not remove safety configs (lint rules, type strictness, git hooks).
- Do not bypass git hooks.
- Do not edit `.env` files.
- Do not introduce circular dependencies.
- Do not import from `apps/*` into `packages/*`.
- Do not import `packages/storage` from `apps/local-web`.
- Do not import Node-only modules (fs, path, etc.) in `apps/local-web`.
- Do not add cloud backend.
- Do not add login or billing.
- Do not add desktop app.
- Always run `pnpm quality` before finishing.
- Prefer small, focused commits.
- Follow roadmap phase boundaries.
- Write tests for new functionality.
- Use `@aiteam/*` workspace imports for internal packages.
- Follow the architecture dependency direction (see `docs/ARCHITECTURE.md`).

## Commit Format

```
type(scope): description
```

Valid types: feat, fix, chore, docs, refactor, test, perf, ci, style.

## Quality Gate

Every change must pass:

```bash
pnpm quality
```

This ensures:

- Formatting is correct
- No lint errors
- TypeScript compiles
- Tests pass
- No unused code
- No circular dependencies
- Architecture boundaries respected
