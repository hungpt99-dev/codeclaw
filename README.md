# Local AI Software Team

A docs-only MVP that generates structured software artifacts (requirements, designs, task breakdowns, test matrices, and reports) from a raw requirement — no AI calls, no cloud backend, fully local.

## Install

```bash
npm install -g @aiteam/cli
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

| Package                | Description                               |
| ---------------------- | ----------------------------------------- |
| `@aiteam/cli`          | CLI tool (`aiteam`)                       |
| `@aiteam/local-web`    | Local web UI (React + Vite + Tailwind)    |
| `@aiteam/local-server` | Standalone server entry point             |
| `@aiteam/core`         | Workflow pipeline and artifact generation |
| `@aiteam/server`       | Fastify API server                        |
| `@aiteam/shared`       | Shared types, schemas, and utilities      |
| `@aiteam/storage`      | SQLite database layer                     |
| `@aiteam/memory`       | Runtime memory management                 |
| `@aiteam/adapters`     | External integrations (stub)              |

## CLI Commands

| Command                    | Description                                     |
| -------------------------- | ----------------------------------------------- |
| `aiteam init`              | Initialize `.ai-team` in the current directory  |
| `aiteam doctor`            | Check that `.ai-team` is properly configured    |
| `aiteam run <requirement>` | Run a docs-only workflow from a raw requirement |
| `aiteam list`              | Show recent runs                                |
| `aiteam show <runId>`      | Show run details                                |
| `aiteam ui`                | Start the local web UI server                   |
| `aiteam memory status`     | Show runtime memory status                      |
| `aiteam memory index`      | Re-index runtime memory files into SQLite       |

Run any command with `--help` for detailed usage:

```bash
aiteam --help
aiteam run --help
aiteam ui --help
```

## Local Web UI

Start the UI server:

```bash
aiteam ui --open
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
aiteam init

# Check configuration
aiteam doctor

# Run a workflow
aiteam run "Add a user login page with email and password authentication" --title "User Login"

# List all runs
aiteam list

# View a specific run
aiteam show run_20260623_120000_user-login

# Start the web UI
aiteam ui --open
```

After running, artifacts are written to `.ai-team/runs/<runId>/` and include:

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
- **Single project** — one `.ai-team` directory per working directory

## Roadmap

- [ ] Real AI integration (LLM-powered agents)
- [ ] Semi-auto and multi-agent workflow modes
- [ ] Assisted coding mode with file generation
- [ ] Web UI dashboard improvements
- [ ] Cloud backend with team collaboration
- [ ] Jira / Slack / GitHub integration
