# Step 48: Additional AI CLI Adapters (Gemini CLI, Aider)

## Status

Planned

## Priority

P2

## Product Goal

Add Gemini CLI and Aider adapters to complement the existing Claude Code and Codex CLI adapters. This completes the four-adapter set defined in the architecture docs and gives users the freedom to choose their preferred AI coding tool.

## Problem

The adapter system currently only supports Claude Code and Codex CLI. The architecture documentation defines support for four AI CLIs: Claude Code, Codex CLI, Gemini CLI, and Aider. Users who use Gemini CLI or Aider cannot use them within the product's semi-auto workflow for code execution. The agent prompt runner (Step 18) can pipe prompts through any CLI, but the production-grade adapters for code execution only exist for two tools.

## Current Evidence

- `packages/adapters/src/ai/adapters/claudeCodeAdapter.ts` — exists
- `packages/adapters/src/ai/adapters/codexAdapter.ts` — exists
- No `geminiAdapter.ts` or `aiderAdapter.ts` exists
- `packages/adapters/src/ai/adapterFactory.ts` — returns null for unknown adapters
- Config schema references all four tool names but only two have implementations
- `aiteam doctor` checks all four tools but only two have working adapters

## Scope

### In Scope

- Gemini CLI adapter with `isAvailable()` and `runTask()` methods
- Aider adapter with `isAvailable()` and `runTask()` methods
- Both adapters follow the same `AiCliAdapter` interface
- Both adapters handle timeout, log streaming, and changed file collection
- Both adapters are registered in the adapter factory
- Doctor command updates to properly test all adapters

### Out of Scope

- Deep integration with tool-specific features (Gemini's file upload, Aider's architect mode)
- Benchmarks comparing tool outputs
- Tool-specific prompt optimization

## Expected User Value

Users who prefer Gemini CLI or Aider can use them for code execution in the semi-auto workflow. All four major AI coding tools are equally supported.

## Expected Behavior

1. Gemini CLI adapter checks for `gemini` command and runs tasks with appropriate flags
2. Aider adapter checks for `aider` command and runs tasks with non-interactive mode
3. Both adapters collect changed files and generate diffs
4. Both adapters handle timeout and streaming
5. Adapter factory returns the correct adapter for any of the four tool names
6. Doctor command tests all configured adapters

## Suggested Files / Modules

- `packages/adapters/src/ai/adapters/geminiAdapter.ts`
- `packages/adapters/src/ai/adapters/aiderAdapter.ts`
- Updates to `adapterFactory.ts`
- Updates to `packages/adapters/src/index.ts`

## Implementation Plan

1. Research Gemini CLI flags for non-interactive, print-only mode
2. Research Aider flags for non-interactive, no-commit mode
3. Create Gemini CLI adapter
4. Create Aider adapter
5. Register both in adapter factory
6. Update tests
7. Update doctor command to test all adapters

## Acceptance Criteria

- Gemini CLI adapter correctly detects `gemini` command availability
- Aider adapter correctly detects `aider` command availability
- Both adapters execute tasks and collect output
- Both adapters collect changed files and generate diffs
- Adapter factory returns correct adapter for all four tool names
- Doctor command shows status for all four tools

## Tests / Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Security Considerations

Adapter must avoid running commands with user input directly. All command arguments must be predefined in the adapter. Aider's `--yes` flag must be used to prevent interactive prompts.

## Risks

- Gemini CLI flags may change between versions
- Aider's output format is complex to parse
- Aider by default creates git commits; must be configured not to
- Testing adapters requires the actual CLI tools to be installed

## Dependencies

- Requires AiCliAdapter interface (already defined)
- Requires adapter factory (already exists)
- Semi-auto workflow should already support configurable agent selection

## Notes for AI Coding Agent

Research the exact CLI flags for each tool before implementing. For Gemini CLI: likely `gemini --print < prompt.txt`. For Aider: `aider --message "<prompt>" --no-auto-commits --yes --no-suggest-shell-commands`. Ensure both adapters never auto-commit or auto-push.
