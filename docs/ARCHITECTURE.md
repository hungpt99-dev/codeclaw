# Architecture

## Monorepo Structure

```
apps/
  cli/           - CLI entry point (Commander.js)
  local-server/  - Local API server (Fastify)
  local-web/     - Web dashboard (React + Vite)

packages/
  shared/        - Shared types, utilities, constants
  core/          - Core business logic, workflow engine
  storage/       - Data persistence layer (SQLite)
  adapters/      - External integrations (Jira, Slack, GitHub)
```

## Dependency Direction

```
apps/* → packages/*
packages/core → packages/shared
packages/storage → packages/shared
packages/adapters → packages/shared
packages/shared → (nothing internal)
```

### Forbidden Imports

- `packages/*` must not import from `apps/*`
- `packages/shared` must not import other internal packages
- `apps/local-web` must not import `packages/storage` directly
- `apps/local-web` must not import Node-only modules (fs, path, etc.)
- Apps must not import from other apps
- No circular dependencies anywhere

## Local-First Design

- All data stored locally (SQLite)
- No cloud backend
- No login or billing
- CLI is the primary engine
- Local web UI is a dashboard for the local server
- No desktop app
