# Contributing

## Branch Naming

- `feat/<description>` for features
- `fix/<description>` for bug fixes
- `chore/<description>` for tooling and config
- `docs/<description>` for documentation

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(cli): add init command
fix(storage): handle missing database
chore(repo): setup git hooks
docs(roadmap): add phase plan
refactor(core): simplify workflow runner
test(shared): add config schema tests
```

## Quality Checks

Run before pushing:

```bash
pnpm quality
```

This runs: format check → lint → typecheck → tests → dependency check → architecture check.

## Adding a Package

1. Create directory under `packages/` or `apps/`
2. Add `package.json` with `@codeclaw/<name>` name
3. Add `tsconfig.json` extending `../../tsconfig.base.json`
4. Add scripts: `typecheck`, `lint`, `lint:fix`, `test`, `build`
5. Update `pnpm-workspace.yaml` if needed
6. Update `knip.json` entry points
7. Update `.dependency-cruiser.cjs` if new rules needed

## Adding a CLI Command

1. Add command handler in `apps/cli/src/`
2. Register in the CLI entry point
3. Add tests

## Adding a UI Page

1. Create component in `apps/local-web/src/`
2. Add route if using a router
3. Add tests
