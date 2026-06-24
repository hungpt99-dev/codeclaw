# Step 34: CLI Management Commands

Implement Step 34: CLI Management Commands.

## Background

CLI Spec defines several management commands that don't run workflow stages but are essential for CLI UX. Currently missing:

- `codeclaw config` — View/modify config (Spec SS10)
- `codeclaw status` — Project status overview (Spec SS11)
- `codeclaw prompts` — Manage prompt templates (Spec SS33)
- `codeclaw artifacts` — List run artifacts (Spec SS29)
- `codeclaw open` — Open files/UI (Spec SS30)
- `codeclaw clean` — Clean old runs/logs (Spec SS32)
- `codeclaw rollback` — Rollback code changes (Spec SS38)

## Tasks

### 1. Create codeclaw config

`apps/cli/src/commands/config.ts`:

```bash
codeclaw config list                    # Show all config
codeclaw config get <key>               # Get specific key
codeclaw config set <key> <value>       # Set key
codeclaw config validate                # Validate config
codeclaw config path                    # Show config file path
```

Backed by `packages/storage/src/repositories/settingRepository.ts` and direct config.json reading.

### 2. Create codeclaw status

`apps/cli/src/commands/status.ts`:

```bash
codeclaw status                         # Overview: project, latest run, AI CLI status
codeclaw status --run <runId>           # Detailed status for a run
codeclaw status --json                  # JSON output
```

Shows: project name, type, latest run, AI CLI availability, storage paths.

### 3. Create codeclaw prompts

`apps/cli/src/commands/prompts.ts`:

```bash
codeclaw prompts list                   # List available prompt templates
codeclaw prompts show <name>            # Show template content
codeclaw prompts edit <name>            # Open in default editor ($EDITOR)
codeclaw prompts reset <name>           # Reset to default
codeclaw prompts validate               # Check all templates for valid variables
```

Edit opens `$EDITOR` with the template file. On save, reloads.

### 4. Create codeclaw artifacts

`apps/cli/src/commands/artifacts.ts`:

```bash
codeclaw artifacts <runId>              # List all artifacts
codeclaw artifacts <runId> --type design # Filter by type
codeclaw artifacts <runId> --json       # JSON output
```

### 5. Create codeclaw open

`apps/cli/src/commands/open.ts`:

```bash
codeclaw open ui                        # Open browser to localhost:4317
codeclaw open run <runId>               # Open run in browser
codeclaw open report <runId>            # Open final report
codeclaw open diff <runId>              # Open diff
codeclaw open config                    # Open config.json in editor
codeclaw open logs <runId>              # Open logs folder
```

Uses platform-specific open command (open, xdg-open, start).

### 6. Create codeclaw clean

`apps/cli/src/commands/clean.ts`:

```bash
codeclaw clean --runs --older-than 30d  # Clean old runs
codeclaw clean --logs --older-than 7d   # Clean logs
codeclaw clean --all --older-than 90d   # Clean everything
codeclaw clean --dry-run                # Preview without deleting
```

Safety: always prompt for confirmation unless `--yes`.

### 7. Create codeclaw rollback

`apps/cli/src/commands/rollback.ts`:

```bash
codeclaw rollback <runId>               # Rollback code changes
codeclaw rollback <runId> --dry-run     # Preview changes
codeclaw rollback <runId> --yes         # Skip confirmation
```

Uses git from Step 23's git service:
1. Check if run has a pre-snapshot
2. `git diff` to show what will be reverted
3. Apply reverse patch or `git checkout` on changed files
4. Requires approval (Gate 6)

## Acceptance Criteria

- All 7 management commands are registered and work
- `codeclaw config get/set` reads/writes config.json
- `codeclaw status` shows project overview
- `codeclaw prompts list/show/edit/reset` manages templates
- `codeclaw artifacts` lists run artifacts
- `codeclaw open` opens files/browser
- `codeclaw clean` safely removes old data
- `codeclaw rollback` reverts code changes with confirmation
- All commands work gracefully when .codeclaw is missing (show helpful message)
