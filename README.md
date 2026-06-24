# CodeClaw

CodeClaw is a local-first AI software team that turns a rough idea into a complete software delivery package.

CodeClaw helps users generate clarified requirements, product requirement documents, UI/UX design documentation, user journeys, technical architecture, frontend plans, backend plans, API designs, data designs, task breakdowns, implementation prompts, coding plans, test plans, review checklists, security reviews, release plans, technical documentation, traceability matrices, and final delivery reports.

## Install

```bash
npm install -g @codeclaw/cli
```

Or from source:

```bash
git clone <repo>
cd auto-code
pnpm install
pnpm build
```

## Development Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run quality checks
pnpm quality
```

The monorepo uses **pnpm workspaces** with these packages:

| Package                  | Description                               |
| ------------------------ | ----------------------------------------- |
| `@codeclaw/cli`          | CLI tool (`codeclaw`)                     |
| `@codeclaw/local-web`    | Local web UI (React + Vite + Tailwind)    |
| `@codeclaw/local-server` | Standalone server entry point             |
| `@codeclaw/core`         | Workflow pipeline and artifact generation |
| `@codeclaw/server`       | Fastify API server                        |
| `@codeclaw/shared`       | Shared types, schemas, and utilities      |
| `@codeclaw/storage`      | SQLite database layer                     |
| `@codeclaw/memory`       | Runtime memory management                 |
| `@codeclaw/adapters`     | External integrations (stub)              |

## CLI Commands

| Command                      | Description                                     |
| ---------------------------- | ----------------------------------------------- |
| `codeclaw init`              | Initialize `.codeclaw` in the current directory |
| `codeclaw doctor`            | Check that `.codeclaw` is properly configured   |
| `codeclaw run <requirement>` | Run a docs-only workflow from a raw requirement |
| `codeclaw list`              | Show recent runs                                |
| `codeclaw show <runId>`      | Show run details                                |
| `codeclaw ui`                | Start the local web UI server                   |
| `codeclaw memory status`     | Show runtime memory status                      |
| `codeclaw memory index`      | Re-index runtime memory files into SQLite       |

Run any command with `--help` for detailed usage:

```bash
codeclaw --help
codeclaw run --help
codeclaw ui --help
```

## Local Web UI

Start the UI server:

```bash
codeclaw ui --open
```

This starts a Fastify server (default `http://127.0.0.1:4317`) serving the React web app. The UI provides:

- **Dashboard** — overview of recent runs and system status
- **New Requirement** — submit a raw requirement for processing
- **Runs** — browse all execution runs and their artifacts
- **Run Detail** — inspect artifacts grouped by category (Requirement, Design, Tasks, Tests, Report)
- **Settings** — configure project-level settings
- **Prompt Templates** — view and edit agent prompt templates

## Example Workflow

```bash
# Initialize in your project directory
codeclaw init

# Check configuration
codeclaw doctor

# Run a workflow
codeclaw run "Add a user login page with email and password authentication" --title "User Login"

# List all runs
codeclaw list

# View a specific run
codeclaw show run_20260623_120000_user-login

# Start the web UI
codeclaw ui --open
```

After running, artifacts are written to `.codeclaw/runs/<runId>/` and include:

- `requirement/clarified-requirement.md`
- `requirement/business-rules.md`
- `requirement/acceptance-criteria.md`
- `design/technical-design.md`
- `design/api-design.md`
- `design/db-design.md`
- `tasks/task-breakdown.md`
- `tests/test-matrix.md`
- `report/final-report.md`

## Current Limitations

- **Docs-only only** — only the `docs-only` workflow mode is implemented
- **No AI calls** — all agent outputs are deterministic template renderings
- **No cloud backend** — everything runs locally with SQLite storage
- **No authentication** — no login, no user management
- **No external integrations** — no Jira, Slack, or GitHub sync
- **Single project** — one `.codeclaw` directory per working directory

## Roadmap

- [ ] Real AI integration (LLM-powered agents)
- [ ] Semi-auto and multi-agent workflow modes
- [ ] Assisted coding mode with file generation
- [ ] Web UI dashboard improvements
- [ ] Cloud backend with team collaboration
- [ ] Jira / Slack / GitHub integration
