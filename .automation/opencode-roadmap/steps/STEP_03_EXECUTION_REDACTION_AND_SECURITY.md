# STEP 03: Execution Output Redaction and Security Hardening

## Status

Planned

## Priority

P1

## Goal

Enable secret redaction on all production command execution paths and fix the `redactSecrets: false` hardcoding that makes the redaction utility ineffective.

## Why This Matters

CodeClaw has a `redactSecrets` utility and the Rust native runner supports secret redaction. However, every single production command execution path hardcodes `redactSecrets: false`, making both redaction mechanisms ineffective. Git output, shell command output, AI CLI tool output, and integration command output are all passed through without redaction.

This means API keys, bearer tokens, database URLs, and other secrets in command output would be stored in logs, artifacts, and reports without masking.

## Current Evidence

All files below set `redactSecrets: false`:

- `packages/adapters/src/git/gitService.ts` — lines 30, 48, 74, 87, 107
- `packages/adapters/src/shell/shellRunner.ts` — line 51
- `packages/adapters/src/ai/agentPromptRunner.ts` — line 56
- `packages/adapters/src/coding/opencodeCodingAgent.ts` — lines 29, 48
- `packages/adapters/src/ai/adapters/opencodeAdapter.ts`
- `packages/adapters/src/integrations/gitHubCliService.ts`
- `packages/core/src/workflows/semiAutoWorkflow.ts`

Only two places use `redactSecrets` at the TypeScript level:
- `packages/core/src/workflows/stepExecutionService.ts` — redacts step error messages
- `packages/core/src/coding/opencodeExecutionReport.ts` — redacts execution report output

## Current Limitation

The Rust native runner's `canonical_redact` function and the TypeScript `canonical_redactSecrets` function exist but are not wired into production execution paths. Commands that may output secrets (git diff showing `.env` files, AI CLI tools echoing prompts with keys, build tools printing environment variables) produce unredacted output that goes into logs and artifacts.

## Expected User Experience

No visible change to users. Redaction should happen silently — secrets in command output are masked before storage.

## Scope

- Change all `redactSecrets: false` to `redactSecrets: true` in production execution paths
- Verify that the Rust native runner's redaction patterns match the TypeScript redactSecrets patterns
- Add test coverage for redacted command output
- Do NOT redact in test paths (test files can use `redactSecrets: false`)

## Out of Scope

- Extending the redaction pattern list (already comprehensive)
- Adding redaction to non-execution paths (LLM API calls, file reads)
- Audit log or retention policy

## Proposed Design

### Change all production `runCommand` calls from:
```ts
redactSecrets: false,
```
to:
```ts
redactSecrets: true,
```

### Files to update

1. `packages/adapters/src/shell/shellRunner.ts` — line 51
2. `packages/adapters/src/git/gitService.ts` — all 5 occurrences
3. `packages/adapters/src/ai/agentPromptRunner.ts` — line 56
4. `packages/adapters/src/coding/opencodeCodingAgent.ts` — both occurrences
5. `packages/adapters/src/ai/adapters/opencodeAdapter.ts` — isAvailable call
6. `packages/adapters/src/integrations/gitHubCliService.ts`
7. `packages/core/src/workflows/semiAutoWorkflow.ts`

### Rust runner compatibility

The Rust native runner's `redaction.rs` already has `redact_line()` and `canonical_redact()` functions with the same patterns as the TypeScript version. The `should_redact()` function returns `true` by default. No Rust changes needed.

## Suggested Files To Modify

- `packages/adapters/src/shell/shellRunner.ts`
- `packages/adapters/src/git/gitService.ts`
- `packages/adapters/src/ai/agentPromptRunner.ts`
- `packages/adapters/src/coding/opencodeCodingAgent.ts`
- `packages/adapters/src/ai/adapters/opencodeAdapter.ts`
- `packages/adapters/src/integrations/gitHubCliService.ts`
- `packages/core/src/workflows/semiAutoWorkflow.ts`

## Data Model / Types / Schemas

No new types needed.

## CLI Changes

No CLI changes.

## API / Server Changes

No API changes.

## Web UI Changes

No web UI changes.

## Storage Changes

No storage changes. Existing artifacts, logs, and reports will have redacted content after this change.

## Rust Runner / Native Execution Changes

No Rust changes needed. The Rust runner already supports redaction when `redactSecrets` is `true`.

## Security Considerations

- Enabling redaction prevents secrets in command output from leaking into logs, artifacts, and reports
- The existing `canonical_redactSecrets` patterns cover: API keys, bearer tokens, Slack xoxb tokens, OAuth tokens, database URLs with passwords, private keys, session tokens
- Git diff output may contain secrets if `.env` files or credential files are accidentally committed — redaction masks these
- Build tool output may print environment variables containing secrets — redaction masks these
- No secrets stored in config.json, SQLite, logs, or artifacts

## Backward Compatibility

- Existing tests may need adjustment if they assert on exact output that now gets redacted
- No functional change — only output masking
- Users see `[REDACTED]` in places where secrets previously appeared

## Detailed Implementation Plan

1. **Change `gitService.ts`** — set `redactSecrets: true` in all 5 NativeRunnerClient calls
2. **Change `shellRunner.ts`** — set `redactSecrets: true`
3. **Change `agentPromptRunner.ts`** — set `redactSecrets: true`
4. **Change `opencodeCodingAgent.ts`** — set `redactSecrets: true` in both calls
5. **Change `opencodeAdapter.ts`** — set `redactSecrets: true`
6. **Change `gitHubCliService.ts`** — set `redactSecrets: true`
7. **Change `semiAutoWorkflow.ts`** — set `redactSecrets: true`
8. **Run tests** — check for test failures due to redacted output
9. **Fix failing tests** — update test assertions to match redacted output
10. **Verify** — `pnpm test`, `pnpm lint`, `pnpm typecheck`

## Tests To Add

No new test files. Update existing test assertions if they assert on unredacted content that will now be redacted.

## Verification Commands

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Acceptance Criteria

- All production `NativeRunnerClient.runCommand()` calls use `redactSecrets: true`
- Step execution error messages are redacted (already implemented)
- Execution reports are redacted (already implemented)
- Git output is redacted
- Shell command output is redacted
- AI CLI tool output is redacted
- GitHub CLI output is redacted
- All existing tests pass
- No functional regression

## Risks

- Some tests may assert on exact command output that now contains `[REDACTED]` — these tests need updating
- If a test expects specific output from a mocked command that contains secret-like patterns, the mock response may get redacted even though it's test data
- The Rust native runner's redaction patterns should be kept in sync with the TypeScript patterns (this is a separate maintenance concern)

## Dependencies

- NativeRunnerClient (already implemented)
- Rust native runner with redaction support (already implemented)
- `canonical_redactSecrets` utility (already implemented)

## Notes For Next OpenCode Run

1. The change is simple: find+replace `redactSecrets: false` with `redactSecrets: true` in all production files
2. Do NOT change test files — tests can keep `redactSecrets: false` to avoid test data being masked
3. After changing, run the full test suite and fix any test that fails because mocked output gets redacted
4. Verify that the Rust runner's `redaction.rs` patterns match TypeScript's `redact.ts` patterns
5. The Rust runner uses `regex-lite` for regex-based redaction — ensure patterns are consistent
