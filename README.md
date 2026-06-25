# CodeClaw

CodeClaw is a local-first AI software team that turns a rough idea into a complete software delivery package.

CodeClaw helps users generate clarified requirements, product requirement documents, UI/UX design documentation, user journeys, technical architecture, frontend plans, backend plans, API designs, data designs, task breakdowns, implementation prompts, coding plans, test plans, review checklists, security reviews, release plans, technical documentation, traceability matrices, and final delivery reports.

CodeClaw supports multiple AI backends:

- **OpenAI-compatible providers** (OpenAI, Azure OpenAI, Anthropic via API, etc.) for planning/reasoning agents
- **OpenCode CLI** for code execution (with approval gate)
- **Claude Code CLI**, **Codex CLI**, **Gemini CLI**, **Aider** for agent output and code execution
- **Deterministic templates** as fallback (no AI required)

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

| Package                  | Description                                  |
| ------------------------ | -------------------------------------------- |
| `@codeclaw/cli`          | CLI tool (`codeclaw`, legacy `aiteam` alias) |
| `@codeclaw/local-web`    | Local web UI (React + Vite + Tailwind)       |
| `@codeclaw/local-server` | Standalone server entry point                |
| `@codeclaw/core`         | Workflow pipeline and artifact generation    |
| `@codeclaw/server`       | Fastify API server                           |
| `@codeclaw/shared`       | Shared types, schemas, and utilities         |
| `@codeclaw/storage`      | SQLite database layer                        |
| `@codeclaw/memory`       | Runtime memory management                    |
| `@codeclaw/adapters`     | AI backends, CLI tool adapters, integrations |

## Quick Start

```bash
# Initialize in your project directory
codeclaw init

# Check configuration
codeclaw doctor

# Run a workflow (docs-only by default, no AI required)
codeclaw run "Add a user login page with email and password authentication" --title "User Login"

# List all runs
codeclaw list

# View a specific run
codeclaw show run_20260623_120000_user-login

# View step-level execution status
codeclaw status --run <runId>

# Retry a failed step
codeclaw retry <runId> --step 0

# Start the web UI
codeclaw ui --open
```

## AI Provider Setup (Optional)

To use LLM-powered agents for planning/reasoning, configure an AI backend:

```bash
# Set your API key (never store in config.json)
export CODECLAW_OPENAI_API_KEY=sk-...

# Enable the provider in config.json
codeclaw config set agentBackend.provider openai-compatible
codeclaw config set agentBackend.model gpt-4o-mini
```

See `.env.example` for all supported environment variables.

## CLI Commands

| Command                      | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| `codeclaw init`              | Initialize `.codeclaw` in the current directory    |
| `codeclaw doctor`            | Check that `.codeclaw` is properly configured      |
| `codeclaw run <requirement>` | Run a workflow from a raw requirement              |
| `codeclaw code --run <id>`   | Generate implementation prompt or run coding agent |
| `codeclaw status [--run]`    | Show project or run status with step details       |
| `codeclaw list`              | Show recent runs                                   |
| `codeclaw show <runId>`      | Show run details                                   |
| `codeclaw resume <runId>`    | Resume a paused or interrupted workflow            |
| `codeclaw retry <runId>`     | Retry a failed step                                |
| `codeclaw cancel <runId>`    | Cancel a running workflow                          |
| `codeclaw approve <runId>`   | Approve a pending workflow gate                    |
| `codeclaw reject <runId>`    | Reject a pending workflow gate                     |
| `codeclaw export <runId>`    | Export run artifacts                               |
| `codeclaw ui`                | Start the local web UI server                      |
| `codeclaw memory status`     | Show runtime memory status                         |
| `codeclaw memory index`      | Re-index runtime memory files into SQLite          |
| `codeclaw config set/get`    | Manage configuration                               |

## Local Web UI

Start the UI server:

```bash
codeclaw ui --open
```

This starts a Fastify server (default `http://127.0.0.1:4317`) serving the React web app. The UI provides:

- **Dashboard** — overview of recent runs and system status (project-scoped)
- **New Requirement** — submit a raw requirement for processing
- **Runs** — browse all execution runs for the selected project (project-scoped)
- **Run Detail** — inspect artifacts with live progress reconnection UI
- **Workflows** — manage server-backed workflow templates (create, edit, duplicate, validate, delete)
- **Projects** — register and switch between multiple projects
- **Doctor** — full system readiness diagnostics (project status, provider, adapters, native runner, security)
- **Settings** — configure project-level settings with Doctor link
- **Prompt Templates** — view and edit agent prompt templates
- **Integrations** — configure GitHub, Jira, Slack integrations

## Artifacts

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
- `coding/implementation-prompt.md` (when coding is enabled)
- `opencode-execution-report.md` (when OpenCode is used)

## Supported AI Backends

### Planning & Reasoning (AgentBackend)

- **OpenAI-compatible** — any API compatible with OpenAI's chat completions endpoint
- **Ollama** — local LLM inference via Ollama (no API key, fully offline)
- **Mock** — deterministic mock for testing (no API key required)

### Code Execution (CodingAgentAdapter)

- **OpenCode CLI** — requires `opencode` on PATH
- **Claude Code CLI** — requires `claude` on PATH
- **Codex CLI** — requires `codex` on PATH
- **Gemini CLI** — requires `gemini` on PATH
- **Aider** — requires `aider` on PATH

### Deterministic Fallback

If no AI backend is configured, all agents use built-in deterministic templates. No AI calls are made, and the system works fully offline.

## Security

- **Never store API keys or tokens in config.json** — use environment variables only
- API keys are read from `CODECLAW_OPENAI_API_KEY` and similar env vars
- Secrets are redacted from logs, artifacts, and reports
- Code execution requires explicit user approval
- See `.env.example` for required environment variables
- See `docs/SECURITY.md` for full security guide

## Example Workflow

```bash
# Initialize in your project directory
codeclaw init

# Check configuration
codeclaw doctor

# Run a full docs workflow
codeclaw run "Add a user login page with email and password authentication" --title "User Login"

# Generate implementation prompt for a coding agent
codeclaw code --run <runId>

# Generate the final report
codeclaw report --run <runId>

# Export run artifacts
codeclaw export <runId> --format zip
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run lint
pnpm lint

# Run typecheck
pnpm typecheck

# Run all quality checks
pnpm quality
```

## Current Limitations

- **Docs-only default mode** — assisted and semi-auto workflows exist but require CLI AI tool configuration
- **No cloud backend** — everything runs locally with SQLite storage
- **No authentication** — no login, no user management
- **External integrations are optional** — Jira, Slack, and GitHub integrations exist but are disabled by default
- **Per-project `.codeclaw` directories** — each project uses its own data directory; global registry stores only safe metadata
- **Project-scoped runs** — runs are stored with `project_id` and filtered at DB level
- **Server-backed workflow templates** — templates are persistent in storage, seeded on first startup, and project-scoped
- **Custom workflow execution** — workflow engine supports custom templates with enabled/disabled steps
- **Web diff viewer** — available in the web UI run detail page
- **Live workflow progress in web UI** — progress events with reconnection UI

## Roadmap Highlights

- [x] Docs-only workflow (deterministic templates)
- [x] Assisted workflow mode (implementation prompt generation)
- [x] Semi-auto workflow mode (AI CLI code execution)
- [x] AgentBackend abstraction (OpenAI-compatible + Mock)
- [x] OpenCode CLI adapter
- [x] Claude Code, Codex, Gemini CLI, Aider adapters
- [x] Approval gates before code execution
- [x] Secret redaction utility
- [x] Persistent step-level execution tracking
- [x] All agents using AgentBackend
- [x] Ollama/local LLM support (Ollama provider)
- [x] Multi-project / workspace support (`codeclaw project`)
- [x] Secret redaction on all execution paths
- [x] Jira / Slack / GitHub integration (optional, disabled by default)
- [x] Web diff viewer (basic)
- [ ] Live workflow progress in web UI
