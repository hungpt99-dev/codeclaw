# Development

## Prerequisites

- Node.js >= 24
- pnpm >= 9

## Setup

```bash
pnpm install
```

## Development

```bash
# Run all packages in dev mode
pnpm dev

# Run specific package
pnpm --filter @codeclaw/cli dev
pnpm --filter @codeclaw/local-server dev
pnpm --filter @codeclaw/local-web dev
```

## Building

```bash
pnpm build
```

## Quality Checks

```bash
# Run all quality checks
pnpm quality

# Individual checks
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm deps:check
pnpm codegraph:check
```

## Code Graph

```bash
# Generate dependency and architecture graphs
pnpm codegraph

# Check for circular dependencies
pnpm codegraph:circular

# Check architecture rules
pnpm arch:check
```

## CLI Local Linking

```bash
pnpm --filter @codeclaw/cli build
# Then use the built CLI directly
```
