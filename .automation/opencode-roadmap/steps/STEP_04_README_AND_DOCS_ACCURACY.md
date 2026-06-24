# STEP 04: README and Documentation Accuracy

## Status

Planned

## Priority

P0

## Goal

Fix stale claims in README.md that understate what is actually implemented. The README currently describes integrations and web diff viewer as "(planned)" when they already exist.

## Why This Matters

Inaccurate documentation is worse than missing documentation. Users reading the README will think integrations and the web diff viewer are not available, when they actually are. This reduces trust and drives users away.

## Current Evidence

README.md line 231:
```
- **No external integrations** — no Jira, Slack, or GitHub sync (planned)
```

**REALITY:** All three integrations exist:
- `packages/adapters/src/integrations/jiraAdapter.ts` — real Jira API client
- `packages/adapters/src/integrations/slackAdapter.ts` — real Slack API client
- `packages/adapters/src/integrations/gitHubCliService.ts` — real GitHub CLI client
- `packages/adapters/src/integrations/gitHubAdapter.ts` — GitHub PR creation, CI reads
- `packages/server/src/routes/integrations.routes.ts` — 47+ integration API routes
- `apps/cli/src/commands/github.ts`, `jira.ts`, `slack.ts` — CLI commands for all three
- `apps/local-web/src/pages/Integrations.tsx` — web UI integration settings page

README.md line 233:
```
- **No web diff viewer** — git diff is available on CLI only (planned)
```

**REALITY:** Web diff viewer exists:
- `apps/local-web/src/components/DiffViewer.tsx` — diff display component
- `apps/local-web/src/components/DiffFileList.tsx` — file list component
- `apps/local-web/src/components/DiffFileView.tsx` — file view component
- `packages/server/src/routes/runs.routes.ts` lines 416-439 — diff and changed-files API routes
- `apps/local-web/src/pages/RunDetail.tsx` lines 1063-1122 — diff viewer is wired into the run detail page

## Current Limitation

README.md understates the product's actual capabilities. Integrations and web diff viewer are marked as "(planned)" when they exist and are functional.

## Expected User Experience

README.md accurately reflects what is implemented. Users can trust the documentation.

## Scope

- Update README.md to reflect actual implementation status of integrations and web diff viewer
- Verify all other claims in README are accurate
- Do NOT claim features that are not implemented
- Do NOT remove legitimate limitations (single project, no live progress in web UI, etc.)

## Out of Scope

- Rewriting the entire README
- Updating other docs files (separate step)
- Changing any source code

## Proposed Design

### README Changes

**Line 231** — Change from:
```
- **No external integrations** — no Jira, Slack, or GitHub sync (planned)
```
To:
```
- **External integrations are optional** — Jira, Slack, and GitHub integrations exist but are disabled by default. Configure via config.json and environment variables.
```

**Line 233** — Change from:
```
- **No web diff viewer** — git diff is available on CLI only (planned)
```
To:
```
- **Web diff viewer** — available in the web UI run detail page
```

**Roadmap highlights (lines 251-252)** — Change from:
```
- [ ] Jira / Slack / GitHub integration
- [ ] Web diff viewer
```
To:
```
- [x] Jira / Slack / GitHub integration (optional, disabled by default)
- [x] Web diff viewer (basic)
```

### Verification

After making changes, verify:
- All checked items in roadmap are actually implemented
- All unchecked items are actually missing or partial
- No overclaimed features

## Suggested Files To Modify

- `README.md`

## Data Model / Types / Schemas

No new types needed.

## CLI Changes

No CLI changes.

## API / Server Changes

No API/Server changes.

## Web UI Changes

No web UI changes.

## Storage Changes

No storage changes.

## Rust Runner / Native Execution Changes

Not required for this step.

## Security Considerations

No security impact — documentation only.

## Backward Compatibility

No code changes.

## Detailed Implementation Plan

1. Read the current README.md entirely
2. Update line 231 (external integrations)
3. Update line 233 (web diff viewer)
4. Update roadmap highlights lines 251-252
5. Verify all other claims are accurate
6. Run `pnpm format:check` to ensure markdown formatting passes

## Tests To Add

No tests needed — documentation only.

## Verification Commands

```bash
pnpm format:check
```

## Acceptance Criteria

- README no longer claims integrations are "(planned)"
- README no longer claims web diff viewer is "(planned)"
- Roadmap highlights accurately reflect implementation status
- No overclaimed features
- Markdown formatting passes

## Risks

- Low risk — documentation only
- Ensure "optional" and "disabled by default" qualifiers are included for integrations

## Dependencies

None.

## Notes For Next OpenCode Run

1. Focus on accuracy, not completeness
2. Do NOT add new feature claims — only fix inaccurate statements
3. The integrations work but are optional and disabled by default — make sure this is clear
4. The web diff viewer works but is basic — qualifying words like "basic" are appropriate
