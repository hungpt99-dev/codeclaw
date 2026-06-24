# Code Quality

## Formatting

Prettier enforces consistent code style. Configuration in `.prettierrc`.

```bash
pnpm format        # Auto-fix formatting (writes files in place)
pnpm format:check  # Check formatting only (exits 1 if unformatted)
```

## Linting

ESLint with TypeScript strict rules. Configuration in `eslint.config.js`.

Key rules:

- No unused variables
- No floating promises
- Consistent type imports
- No console (except CLI and server entry points)

```bash
pnpm lint          # Check linting
pnpm lint:fix      # Auto-fix linting issues
```

## Type Checking

Strict TypeScript across all packages. Configuration in `tsconfig.base.json`.

```bash
pnpm typecheck
```

## Testing

Vitest with coverage support.

```bash
pnpm test           # Run all tests
pnpm test:coverage  # Run with coverage
```

## Unused Code Detection

Knip detects unused files, exports, and dependencies. Configuration in `knip.json`.

```bash
pnpm deps:check
```

## Architecture Rules

Dependency-cruiser enforces import boundaries. Configuration in `.dependency-cruiser.cjs`.

```bash
pnpm arch:check     # Check architecture rules
pnpm arch:graph     # Generate architecture graph
```

## Circular Dependencies

Madge detects circular imports.

```bash
pnpm codegraph:circular   # Check for circular dependencies
pnpm codegraph:deps       # Generate dependency graph
```

## Code Graph

Visual dependency and architecture graphs in `docs/codegraph/`.

```bash
pnpm codegraph
```
