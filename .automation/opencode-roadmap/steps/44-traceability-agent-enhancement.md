# Step 44: Traceability Agent Enhancement

## Status

Planned

## Priority

P2

## Product Goal

Upgrade the existing traceability engine into a dedicated Traceability Agent that produces richer, more maintainable traceability reports with coverage analysis, gap detection, and actionable recommendations. This makes traceability a first-class agent responsibility rather than a mechanical engine.

## Problem

The current traceability system (`packages/core/src/traceability/traceabilityEngine.ts`) is a deterministic parser that extracts IDs from markdown artifacts and computes coverage status. It works but:
- Produces output without narrative or recommendations
- Cannot identify WHY coverage is partial or missing
- Does not handle after-code traceability (mapping code files to requirements)
- Is not exposed as a dedicated agent that can be prompted
- Has no AI mode to enrich traceability with reasoning

## Current Evidence

- `packages/core/src/traceability/traceabilityEngine.ts` — deterministic engine, no AI mode
- `packages/core/src/traceability/traceabilityParser.ts` — ID parser only
- `packages/storage/src/repositories/traceabilityRepository.ts` — storage repository
- No `traceabilityAgent.ts` file exists
- Traceability is generated automatically but not independently triggerable as an agent task
- Coverage status is mechanical (has test = covered) without qualitative assessment

## Scope

### In Scope

- Traceability Agent with dual-mode (AI + deterministic) following same pattern as other agents
- Enhanced traceability output with coverage analysis narrative
- Gap detection: which requirements lack tasks, tests, or code files
- After-code traceability: map changed code files to requirements
- Traceability summary included in final report
- Independent trigger: `aiteam trace --run <runId>` with optional AI enhancement
- Prompt template for AI-enhanced traceability

### Out of Scope

- Bidirectional traceability (forward from requirement, backward from code)
- Live traceability updates during workflow execution
- Integration with external traceability tools

## Expected User Value

Traceability becomes more useful than a mechanical ID-to-ID mapping. The agent explains WHY something is partially covered and recommends actions. Users can trust the traceability matrix as a quality signal, not just a checklist.

## Expected Behavior

1. After workflow stages complete, Traceability Agent runs
2. Agent parses requirement, task, test, and code artifacts
3. Agent generates coverage matrix with status per requirement
4. If AI mode enabled, agent enriches output with coverage analysis and recommendations
5. If deterministic mode, agent produces mechanical matrix (existing behavior)
6. Traceability is included in final report and export
7. User can run `aiteam trace --run <runId>` independently

## Suggested Files / Modules

- `packages/core/src/agents/traceabilityAgent.ts`
- `packages/core/src/agents/parsers/traceabilityOutputParser.ts`
- `templates/prompts/traceability-agent.md`
- Refactor `traceabilityEngine.ts` to be called by agent
- Update `aiteam trace` CLI command to support AI mode

## Implementation Plan

1. Create Traceability Agent with dual-mode support
2. Create traceability agent prompt template
3. Create output parser for AI-enhanced traceability
4. Refactor existing traceability engine as deterministic fallback
5. Add AI enhancement mode to `aiteam trace` CLI
6. Update traceability section in final report
7. Add tests

## Acceptance Criteria

- Traceability Agent produces standard coverage matrix in deterministic mode
- In AI mode, agent enriches output with coverage analysis and gap recommendations
- After-code traceability maps changed files to requirements
- Coverage status includes: COVERED, PARTIAL, NOT_COVERED, UNKNOWN
- Agent can be triggered independently via CLI
- Existing traceability functionality is preserved as deterministic fallback

## Tests / Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Security Considerations

Traceability output references file paths but must not include secret values.

## Risks

- AI-enriched traceability may hallucinate code-to-requirement mappings
- Deterministic mode may incorrectly mark items as uncovered due to parsing limitations

## Dependencies

- Built on existing `traceabilityEngine.ts` and `traceabilityRepository.ts`
- Requires all design and planning artifacts to be present
- For after-code mode, requires changed-files.json from code execution

## Notes for AI Coding Agent

Keep the existing deterministic engine as the fallback. The AI mode should only enhance, not replace, the deterministic matrix. Use the agent prompt to ask the AI to: verify mappings, identify gaps, suggest additional tests, and note risks.
