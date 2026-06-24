# Step 47: Real LLM Provider Integration

## Status

Planned

## Priority

P2

## Product Goal

Add direct LLM provider integration (OpenAI-compatible API and local models via Ollama/LM Studio) so users can choose between using their installed AI CLI tools or connecting directly to LLM APIs. This gives users flexibility and enables faster agent execution without CLI tool overhead.

## Problem

Currently, AI-powered agent output relies entirely on the user's installed AI CLI tools (Claude Code, Codex CLI, etc.). This has limitations:
- Not all users have these CLIs installed
- CLI tools add process spawning overhead
- Some CLIs may not support `--print` mode for pure text output
- Users who already pay for OpenAI/Anthropic APIs cannot use them directly
- Local models (Ollama, LM Studio) are not supported as agent backends

## Current Evidence

- `packages/adapters/src/ai/agentPromptRunner.ts` — only supports CLI tools via execa
- `packages/adapters/src/ai/agentRunner.ts` — delegates to CLI tools only
- No `aiProvider.ts` or `llmClient.ts` exists
- No OpenAI API client
- No Ollama/LM Studio integration
- Config schema has no LLM provider configuration
- All agent output depends on external CLI tools being installed

## Scope

### In Scope

- LLM provider abstraction layer: common interface for OpenAI-compatible and local models
- OpenAI-compatible API client (works with OpenAI, Anthropic via API, Azure OpenAI)
- Ollama client for local model inference
- LM Studio client (OpenAI-compatible local server)
- Provider configuration in `.ai-team/config.json` (provider name, model, base URL only — no secrets)
- API key management via environment variables only (no storage in config)
- Provider as alternative to CLI tools for agent output
- Deterministic fallback when neither CLI tool nor LLM provider is available

### Out of Scope

- Multi-provider load balancing
- Provider failover
- Streaming LLM responses (future enhancement)
- Fine-tuning or model management
- Token usage tracking and cost estimation

## Expected User Value

Users can choose their preferred AI backend. Those who pay for OpenAI API can connect directly for faster, more reliable agent output. Those with local GPUs can use Ollama for fully offline operation. Users without any AI CLI tools can still use the product with an API key.

## Expected Behavior

1. User configures LLM provider in settings (provider name, model, base URL)
2. API key is stored in environment variable (never in config.json)
3. Agent system checks: AI CLI configured → try CLI; LLM provider configured → try provider; neither → deterministic fallback
4. Provider API calls include proper timeout, retry, and error handling
5. No API keys appear in logs, artifacts, or prompts
6. User can switch between CLI tools and LLM providers per agent role

## Suggested Files / Modules

- `packages/adapters/src/ai/providers/providerInterface.ts` — common interface
- `packages/adapters/src/ai/providers/openAiCompatibleProvider.ts` — OpenAI-compatible client
- `packages/adapters/src/ai/providers/ollamaProvider.ts` — Ollama client
- `packages/adapters/src/ai/providers/providerFactory.ts` — factory
- `packages/shared/src/schemas/provider.schema.ts` — provider config schema
- Updates to `agentRunner.ts` to support provider fallback chain
- Updates to settings UI for provider configuration
- Updates to doctor command to test provider connection

## Implementation Plan

1. Create LLM provider interface and types
2. Create OpenAI-compatible API client
3. Create Ollama client
4. Create provider factory
5. Add provider configuration to config schema
6. Add provider support to agent runner (CLI → Provider → Deterministic)
7. Add provider settings to web UI
8. Add provider test to doctor command
9. Add tests

## Acceptance Criteria

- OpenAI-compatible client works with OpenAI API
- Ollama client works with local models
- Provider configuration is stored in config.json (without secrets)
- API keys are read from environment variables only
- Agent runner falls back correctly: CLI → Provider → Deterministic
- Provider test button works in settings
- No API keys leak into logs or artifacts
- All existing tests still pass

## Tests / Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Security Considerations

- API keys must NEVER be stored in config.json, logs, artifacts, or prompts
- API keys must come from environment variables only
- Provider responses must be sanitized before logging
- Token values must be masked in doctor output

## Risks

- LLM API costs may surprise users if not tracked
- Provider API compatibility varies (not all OpenAI-compatible APIs work the same)
- Ollama local inference is slower than cloud APIs
- Some prompts may exceed context window limits

## Dependencies

- Requires agent runner (Step 18) to be refactored for provider support
- Config schema in shared package
- Settings UI in web app

## Notes for AI Coding Agent

Implement the provider interface first, then OpenAI client, then Ollama. The fallback chain should be: if CLI tool is configured and available → use CLI. Else if provider is configured and key is available → use provider. Else → deterministic fallback. Never fail if both are unavailable — always fall back to deterministic.
