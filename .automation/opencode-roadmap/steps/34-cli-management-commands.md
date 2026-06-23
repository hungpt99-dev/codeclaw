# Step 34: CLI Management Commands

Implement Step 34: CLI Management Commands.

## Background

CLI Spec defines several management commands that don't run workflow stages but are essential for CLI UX. Currently missing:

- `aiteam config` — View/modify config (Spec SS10)
- `aiteam status` — Project status overview (Spec SS11)
- `aiteam prompts` — Manage prompt templates (Spec SS33)
- `aiteam artifacts` — List run artifacts (Spec SS29)
- `aiteam open` — Open files/UI (Spec SS30)
- `aiteam clean` — Clean old runs/logs (Spec SS32)
- `aiteam rollback` — Rollback code changes (Spec SS38)

## Tasks

### 1. Create aiteam config

`apps/cli/src/commands/config.ts`:

```bash
aiteam config list                    # Show all config
aiteam config get <key>               # Get specific key
aiteam config set <key> <value>       # Set key
aiteam config validate                # Validate config
aiteam config path                    # Show config file path
```

Backed by `packages/storage/src/repositories/settingRepository.ts` and direct config.json reading.

### 2. Create aiteam status

`apps/cli/src/commands/status.ts`:

```bash
aiteam status                         # Overview: project, latest run, AI CLI status
aiteam status --run <runId>           # Detailed status for a run
aiteam status --json                  # JSON output
```

Shows: project name, type, latest run, AI CLI availability, storage paths.

### 3. Create aiteam prompts

`apps/cli/src/commands/prompts.ts`:

```bash
aiteam prompts list                   # List available prompt templates
aiteam prompts show <name>            # Show template content
aiteam prompts edit <name>            # Open in default editor ($EDITOR)
aiteam prompts reset <name>           # Reset to default
aiteam prompts validate               # Check all templates for valid variables
```

Edit opens `$EDITOR` with the template file. On save, reloads.

### 4. Create aiteam artifacts

`apps/cli/src/commands/artifacts.ts`:

```bash
aiteam artifacts <runId>              # List all artifacts
aiteam artifacts <runId> --type design # Filter by type
aiteam artifacts <runId> --json       # JSON output
```

### 5. Create aiteam open

`apps/cli/src/commands/open.ts`:

```bash
aiteam open ui                        # Open browser to localhost:4317
aiteam open run <runId>               # Open run in browser
aiteam open report <runId>            # Open final report
aiteam open diff <runId>              # Open diff
aiteam open config                    # Open config.json in editor
aiteam open logs <runId>              # Open logs folder
```

Uses platform-specific open command (open, xdg-open, start).

### 6. Create aiteam clean

`apps/cli/src/commands/clean.ts`:

```bash
aiteam clean --runs --older-than 30d  # Clean old runs
aiteam clean --logs --older-than 7d   # Clean logs
aiteam clean --all --older-than 90d   # Clean everything
aiteam clean --dry-run                # Preview without deleting
```

Safety: always prompt for confirmation unless `--yes`.

### 7. Create aiteam rollback

`apps/cli/src/commands/rollback.ts`:

```bash
aiteam rollback <runId>               # Rollback code changes
aiteam rollback <runId> --dry-run     # Preview changes
aiteam rollback <runId> --yes         # Skip confirmation
```

Uses git from Step 23's git service:
1. Check if run has a pre-snapshot
2. `git diff` to show what will be reverted
3. Apply reverse patch or `git checkout` on changed files
4. Requires approval (Gate 6)

## Acceptance Criteria

- All 7 management commands are registered and work
- `aiteam config get/set` reads/writes config.json
- `aiteam status` shows project overview
- `aiteam prompts list/show/edit/reset` manages templates
- `aiteam artifacts` lists run artifacts
- `aiteam open` opens files/browser
- `aiteam clean` safely removes old data
- `aiteam rollback` reverts code changes with confirmation
- All commands work gracefully when .ai-team is missing (show helpful message)
