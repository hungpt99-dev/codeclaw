# Code Graph

## Overview

Code graph tools help visualize and enforce the repository's dependency structure.

## Generating Graphs

```bash
# Generate both dependency and architecture graphs
pnpm codegraph

# Generate only the dependency graph
pnpm codegraph:deps

# Generate only the architecture graph
pnpm arch:graph
```

Output files:

- `docs/codegraph/dependencies.svg` - Module-level dependency graph (madge)
- `docs/codegraph/architecture.svg` - Architecture-level dependency graph (dependency-cruiser)

## Checking Circular Dependencies

```bash
pnpm codegraph:circular
```

This uses madge to detect any circular imports between modules. If any are found, they must be resolved before merging.

## Checking Architecture Rules

```bash
pnpm arch:check
```

This uses dependency-cruiser to enforce import boundaries defined in `.dependency-cruiser.cjs`.

### Architecture Rules

- `apps/*` can import from `packages/*`
- `packages/*` must not import from `apps/*`
- `packages/shared` must not import other internal packages
- `apps/local-web` must not import `packages/storage`
- `apps/local-web` must not import Node-only modules
- No circular dependencies anywhere

## Reading the Graphs

### Dependency Graph (dependencies.svg)

Shows how modules import each other. Each node is a file or directory. Arrows point from importer to imported.

### Architecture Graph (architecture.svg)

Shows the layered architecture. Each node is a package. Arrows show allowed import directions. Red arrows indicate violations.
