# STEP 00: All Agents Use AgentBackend

## Status

Planned

## Priority

P2

## Goal

Make every CodeClaw agent use the AgentBackend abstraction instead of directly calling CLI AI tools or falling back to deterministic templates.

## Why This Matters

Currently only 2 of 19 agents (BA and Architect) use AgentBackend. The remaining 17 agents still call CLI AI tools directly via `runAgent()` or fall back to deterministic templates. This means:

- Users who configure an LLM provider (e.g., OpenAI-compatible) get AI-powered output only from BA and Architect
- All other agents (PM, QA, Frontend Planner, Backend Planner, Developer, Reviewer, etc.) skip the provider and either run CLI tools or use generic templates
- The product feels inconsistent — half AI, half deterministic
- Users cannot get a fully AI-powered software team

## Current Evidence

- `packages/core/src/agents/baAgent.ts` — uses AgentBackend (DONE)
- `packages/core/src/agents/architectAgent.ts` — uses AgentBackend (DONE)
- `packages/core/src/agents/pmAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/qaAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/developerAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/codingPlanAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/reporterAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/frontendPlannerAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/backendPlannerAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/integrationPlannerAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/devopsReleaseAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/technicalDocumentationAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/traceabilityAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/codeReviewerAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/securityReviewerAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/userJourneyAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/poAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/uiDesignerAgent.ts` — does NOT use AgentBackend
- `packages/core/src/agents/uxWriterAgent.ts` — does NOT use AgentBackend

Total: 2 using AgentBackend, 17 not using AgentBackend.

## Current Limitation

Only BA and Architect agents produce AI-quality output when an LLM provider is configured. All other agents produce deterministic template output or require CLI AI tools.

## Expected User Experience

When a user configures `agentBackend.provider: "openai-compatible"`:

1. All 19 agents use the configured LLM provider for their output
2. Agent output quality is consistent across all roles
3. No agent silently falls back to deterministic templates when a provider is configured and available
4. Deterministic templates remain as fallback when no provider is configured (existing behavior preserved)

## Scope

- Modify all 17 remaining agents to accept `agentBackendConfig` in their options
- Each agent should call `runWithAgentBackend()` first (if provider configured and available)
- Fall back to CLI AI tool if configured
- Fall back to deterministic templates last
- Update workflow inputs to pass `agentBackendConfig` through

## Out of Scope

- Creating new agents (all 19 already exist)
- Changing the deterministic template content
- Adding new LLM providers (step 01 covers Ollama)
- Changing the AgentBackend interface itself

## Proposed Design

Each agent follows the same pattern already established in `baAgent.ts` and `architectAgent.ts`:

```ts
export async function runXxxAgent(
  input: XxxAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
    agentBackendConfig?: AgentBackendConfig | undefined;
  },
): Promise<XxxAgentOutput> {
  // 1. Try AgentBackend first
  if (options?.agentBackendConfig) {
    const result = await runWithAgentBackend({ ... });
    if (result?.content) {
      return parseXxxOutput(result.content, input);
    }
  }

  // 2. Try CLI AI tool second
  if (options?.aiTool) {
    const result = await runAgent({ ... });
    if (result.success && result.usedAi) {
      return parseXxxOutput(result.output, input);
    }
  }

  // 3. Deterministic fallback
  return { ... };
}
```

## Suggested Files To Modify

Each of these 17 files needs the same modification pattern:

- `packages/core/src/agents/backendPlannerAgent.ts`
- `packages/core/src/agents/codeReviewerAgent.ts`
- `packages/core/src/agents/codingPlanAgent.ts`
- `packages/core/src/agents/developerAgent.ts`
- `packages/core/src/agents/devopsReleaseAgent.ts`
- `packages/core/src/agents/frontendPlannerAgent.ts`
- `packages/core/src/agents/integrationPlannerAgent.ts`
- `packages/core/src/agents/pmAgent.ts`
- `packages/core/src/agents/poAgent.ts`
- `packages/core/src/agents/qaAgent.ts`
- `packages/core/src/agents/reporterAgent.ts`
- `packages/core/src/agents/securityReviewerAgent.ts`
- `packages/core/src/agents/technicalDocumentationAgent.ts`
- `packages/core/src/agents/traceabilityAgent.ts`
- `packages/core/src/agents/uiDesignerAgent.ts`
- `packages/core/src/agents/userJourneyAgent.ts`
- `packages/core/src/agents/uxWriterAgent.ts`

## Data Model / Types / Schemas

No new types needed. Reuse these existing types:

- `AgentBackendConfig` from `@codeclaw/shared`
- `runWithAgentBackend` from `packages/core/src/agents/agentBackendRunner.ts`
- `XxxAgentInput` / `XxxAgentOutput` — agent-specific (already exist)

## CLI Changes

No CLI changes. The `agentBackendConfig` flows from `config.json` through workflow inputs.

## API / Server Changes

No API changes.

## Web UI Changes

No web UI changes.

## Storage Changes

No storage changes.

## Rust Runner / Native Execution Changes

Not required for this step — AgentBackend calls LLM APIs via HTTPS, not via the native runner.

## Security Considerations

- `agentBackendConfig` contains only safe metadata (provider name, model name, env var name, base URL, timeout)
- API keys come from environment variables, never from config
- Agent output that contains secrets must be redacted (existing `redactSecrets` utility handles this)
- No new secret exposure risk

## Backward Compatibility

- Existing agents without `agentBackendConfig` continue to work as before (CLI tools or deterministic templates)
- Existing workflow inputs without `agentBackendConfig` work unchanged
- Existing tests pass without modification

## Detailed Implementation Plan

1. **Pick reference agent**: Re-read `baAgent.ts` — it's the canonical reference for the AgentBackend pattern
2. **Modify one agent at a time**: Apply the same pattern to each of the 17 agents
3. **For each agent**:
   a. Add import: `runWithAgentBackend` from `./agentBackendRunner.js`
   b. Add import: `AgentBackendConfig` from `@codeclaw/shared`
   c. Add `agentBackendConfig` parameter to options type
   d. Add AgentBackend attempt block before CLI tool attempt
   e. Wire `agentBackendConfig` in all workflow entrypoints that call this agent
4. **Batch by similarity**: Group agents with similar input/output shapes
5. **Test each batch**: Run `pnpm test` after each group
6. **Prioritize parser agents first**: Agents with simple input/output (PO, QA, Reporter) are easiest
7. **Developer and Reviewer agents last**: These have complex output and parsing

## Tests To Add

No new test files needed. Existing agent tests should continue to pass without AgentBackend configured. Add one integration-style test for one agent to verify the AgentBackend path:

- `packages/core/src/agents/pmAgent.test.ts` — add test with mock AgentBackend
- Or pick any agent and verify that `agentBackendConfig` is accepted and the agent runs without error

## Verification Commands

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Acceptance Criteria

- All 19 agents accept `agentBackendConfig` option
- Agents call `runWithAgentBackend` when config is provided
- Agents fall back to CLI tools when AgentBackend is not configured
- Agents fall back to deterministic templates when nothing is configured
- All existing tests pass
- TypeScript compiles without errors
- Lint passes

## Risks

- Each agent has a different input/output shape — the pattern must be adapted per agent
- Parser functions may not handle LLM output format correctly (may need test adjustments)
- Some agents have deeply nested workflow integration (e.g., developerAgent is called from multiple places)
- Time estimate: 17 agents × ~15 minutes each = ~4 hours for a single coding agent

## Dependencies

- AgentBackend interface and `runWithAgentBackend` function (already implemented)
- `AgentBackendConfig` type (already exists in shared)
- Workflow input types that accept `agentBackendConfig` (already added to AssistedWorkflowInput, SemiAutoWorkflowInput, WorkflowRunnerInput)

## Notes For Next OpenCode Run

1. Start with the simplest agents: `poAgent.ts`, `qaAgent.ts`, `reporterAgent.ts`, `codingPlanAgent.ts`
2. These have simple inputs and well-defined parsers
3. Save complex agents for last: `developerAgent.ts`, `codeReviewerAgent.ts`, `securityReviewerAgent.ts`
4. After modifying each agent, run `pnpm --filter @codeclaw/core test` to verify
5. Do NOT modify the deterministic template content — only add the AgentBackend path
6. The `agentBackendConfig` parameter is already wired through workflow inputs — just accept it in each agent
7. Do not remove the existing `aiTool` path — AgentBackend is attempted first, CLI tools second
