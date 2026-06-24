# STEP 02: Multi-Project / Workspace Support

## Status

Planned

## Priority

P3

## Goal

Add support for managing multiple projects in CodeClaw so users can switch between different codebases without changing directories.

## Why This Matters

CodeClaw currently uses one `.codeclaw` directory per working directory. Users with multiple projects must `cd` between directories, manage separate configs, and can't see all runs across projects. Multi-project support makes CodeClaw feel like a proper development tool rather than a per-project script.

## Current Evidence

- `apps/cli/src/commands/init.ts` — creates `.codeclaw/` in current directory only
- `apps/cli/src/commands/run.ts` — uses `join(process.cwd(), ".codeclaw")` for all paths
- No global registry or project database
- README lists "Single project — one `.codeclaw` directory per working directory" as a limitation
- No `codeclaw project` command
- No `--project` flag on any command

## Current Limitation

Users must `cd` to the correct directory to run CodeClaw commands. There is no way to:
- Register a project with a friendly name
- List all projects
- Switch between projects without changing directories
- Run workflows on a project from any directory
- See runs across all projects in one view

## Expected User Experience

```bash
# Add a project
codeclaw project add ~/projects/my-app --name my-app

# List projects
codeclaw project list

# Set active project
codeclaw project use my-app

# Run workflow on active project (from any directory)
codeclaw run "build a login page"

# Run on a specific project
codeclaw run "add auth" --project my-app

# Show current project
codeclaw project current

# Remove a project
codeclaw project remove my-app
```

## Scope

- Global project registry at `~/.codeclaw/projects.json` (or similar)
- `codeclaw project add/list/use/current/remove` commands
- `--project` flag on `run`, `code`, `test`, `status`, `export`, `show` commands
- Per-project `.codeclaw` directory (existing layout, just scoped by project root)
- Backward-compatible: commands without `--project` use current directory `.codeclaw`
- Project stores: id, name, rootPath, createdAt, updatedAt, lastUsedAt

## Out of Scope

- Project templates (future)
- Cloud project sync (future)
- Team project sharing (future)
- Moving existing `.codeclaw` data (user can re-init)

## Proposed Design

### Project Registry

```
~/.codeclaw/
  projects.json          # Global project registry
```

```json
[
  {
    "id": "proj_abc123",
    "name": "my-app",
    "rootPath": "/Users/alice/projects/my-app",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z",
    "lastUsedAt": "2025-01-02T00:00:00Z"
  }
]
```

### Command Resolution

For any command that needs `.codeclaw`:

1. If `--project <name>` is provided, look up project by name in registry, resolve rootPath
2. If no `--project`, check current directory for `.codeclaw/`
3. If no `.codeclaw/` in current directory, check if there's an active project (from `codeclaw project use`)
4. If nothing found, show error

### Module Structure

- `packages/core/src/project/projectRegistry.ts` — read/write registry, CRUD operations
- `packages/core/src/project/projectResolver.ts` — resolve `.codeclaw` path from project name or cwd
- `apps/cli/src/commands/project.ts` — CLI command handler

### Backward Compatibility

- Commands without `--project` continue to use `process.cwd()` as before
- Users who never use `codeclaw project` see zero behavior change
- Existing `.codeclaw` directories are compatible with project resolution

## Suggested Files To Create

- `packages/shared/src/types/project.ts` — project types
- `packages/core/src/project/projectRegistry.ts` — registry service
- `packages/core/src/project/projectResolver.ts` — path resolver
- `apps/cli/src/commands/project.ts` — CLI command

## Suggested Files To Modify

- `packages/shared/src/index.ts` — export project types
- `packages/core/src/index.ts` — export project services
- `apps/cli/src/index.ts` — register `project` command
- `apps/cli/src/commands/run.ts` — add `--project` flag
- `apps/cli/src/commands/code.ts` — add `--project` flag
- `apps/cli/src/commands/status.ts` — add `--project` flag
- `apps/cli/src/commands/export.ts` — add `--project` flag
- `apps/cli/src/commands/list.ts` — add `--project` flag
- `apps/cli/src/commands/show.ts` — add `--project` flag

## Data Model / Types / Schemas

```ts
// packages/shared/src/types/project.ts
export interface ProjectRegistryEntry {
  id: string;
  name: string;
  rootPath: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

export interface ProjectRegistry {
  version: 1;
  projects: ProjectRegistryEntry[];
  activeProjectId: string | null;
}
```

## CLI Changes

New commands:

```bash
codeclaw project add <rootPath> [--name <name>]
codeclaw project list [--json]
codeclaw project use <nameOrId>
codeclaw project current
codeclaw project remove <nameOrId>
```

Modified commands add `--project` flag:

```bash
codeclaw run <requirement> [--project <name>]
codeclaw status [--run <runId>] [--project <name>]
codeclaw code --run <runId> [--project <name>]
codeclaw export <runId> [--format <fmt>] [--project <name>]
```

## API / Server Changes

- Add `/api/projects` routes for web UI project management
- Server should accept `projectId` or resolve from project root

## Web UI Changes

- Add project selector dropdown in the header/sidebar
- Add project management page (add/list/remove)
- Run lists should show project name or be filterable by project

## Storage Changes

- Global registry at `~/.codeclaw/projects.json`
- Per-project `.codeclaw` remains in project root (unchanged)
- Runs, artifacts, memory remain per-project (unchanged layout)
- Registry stores only safe metadata (no secrets)

## Rust Runner / Native Execution Changes

Not required for this step — native runner already uses `cwd` which will be resolved by project resolver.

## Security Considerations

- Project registry stores only safe metadata: id, name, rootPath, timestamps
- No secrets stored in registry
- `rootPath` validation: must be an absolute path, must exist on filesystem, must not be a symlink to sensitive directories
- `codeclaw project add` should validate that the path exists and is a directory
- Path traversal prevention: `--project` name must match exactly from registry (no path injection)
- Active project stored in registry is safe (just an id reference)

## Backward Compatibility

- All existing commands without `--project` work exactly as before
- Existing `.codeclaw` directories are compatible — they become the project's data directory when registered
- The `codeclaw init` command remains unchanged for single-project use
- Users who never use `codeclaw project` see no difference

## Detailed Implementation Plan

1. **Add project types** — create `packages/shared/src/types/project.ts` and export from shared
2. **Create registry service** — `packages/core/src/project/projectRegistry.ts` with functions:
   - `loadRegistry()` — read from `~/.codeclaw/projects.json`
   - `saveRegistry()` — write to `~/.codeclaw/projects.json`
   - `addProject(name, rootPath)` — validate path, create entry, save
   - `listProjects()` — return all entries
   - `findProject(nameOrId)` — lookup by name or id
   - `setActiveProject(id)` — set active project
   - `removeProject(id)` — remove entry
   - `resolveProjectDir(nameOrId?)` — resolve `.codeclaw` path from project or cwd
3. **Create `project.ts` CLI command** — register add/list/use/current/remove
4. **Add `--project` flag to `run.ts`** — use `resolveProjectDir` to find `.codeclaw`
5. **Add `--project` flag to `status.ts`, `code.ts`, `export.ts`** — same pattern
6. **Add tests** — registry CRUD, project resolution, backward compatibility
7. **Add web UI project selector** — future step, just note as TODO

## Tests To Add

- `packages/shared/src/types/project.test.ts` — type validation
- `packages/core/src/project/projectRegistry.test.ts` — CRUD operations, file I/O mocking
- `packages/core/src/project/projectResolver.test.ts` — resolution logic
- `apps/cli/src/commands/project.test.ts` — CLI command parsing
- Integration test: add project, list, use, run with --project

## Verification Commands

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Acceptance Criteria

- `codeclaw project add ~/my-project --name my-app` adds a project and creates the registry
- `codeclaw project list` shows all registered projects
- `codeclaw project use my-app` sets active project
- `codeclaw run "..." --project my-app` resolves the correct `.codeclaw` directory
- `codeclaw run "..."` without flags uses current directory (backward compatible)
- `codeclaw project current` shows the active project
- `codeclaw project remove my-app` removes the entry without deleting project files
- Registry file is valid JSON
- All existing tests pass

## Risks

- Global `~/.codeclaw/` directory may conflict with existing per-project `.codeclaw/` convention — document that they are different
- Users may expect `codeclaw project add` to also run `codeclaw init` — it should only register, not init
- Cross-platform path handling: `rootPath` must use forward slashes or be normalized
- If registry file is corrupted, all project resolution fails — add try/catch with fallback to cwd-based resolution
- Active project could point to a deleted/moved directory — resolution should validate the path exists

## Dependencies

- CLI command infrastructure (Commander.js)
- Shared types package
- Core service for registry management
- File system access for registry read/write

## Notes For Next OpenCode Run

1. Start with types and registry service — these have no external dependencies
2. The registry file path should be `os.homedir() + "/.codeclaw/projects.json"` or use `process.env.CODECLAW_HOME` if set
3. Create `~/.codeclaw/` directory with mkdir recursive on first registry write
4. Registry file should be pretty-printed JSON for manual editing
5. Add `-p` as shorthand for `--project` if it doesn't conflict with existing flags
6. Do NOT modify `codeclaw init` — it should still create per-project `.codeclaw/` as before
7. The project resolver should be a simple function, not a class
8. Test with a temporary home directory to avoid polluting real `~/.codeclaw/`
