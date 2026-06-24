# STEP 01: Ollama / Local LLM Provider

## Status

Planned

## Priority

P2

## Goal

Add Ollama as a local LLM provider for AgentBackend so users can run AI-powered agents fully offline without API keys or cloud dependencies.

## Why This Matters

CodeClaw positions itself as a local-first AI software team. But the only LLM provider available is OpenAI-compatible (requires API key and internet). Users who want fully offline operation, privacy, or free local inference cannot use AI-powered agents. Adding Ollama support makes CodeClaw truly local-first for AI as well as data.

## Current Evidence

- `packages/adapters/src/agentBackend/openaiCompatibleProvider.ts` — only provider, requires API key and internet
- `packages/adapters/src/agentBackend/mockAgentBackend.ts` — mock for tests only
- No Ollama client exists anywhere
- No local inference support
- README Roadmap section lists `Ollama/local LLM support` as unchecked

## Current Limitation

Users who want local AI inference must:
1. Have an internet connection
2. Have an API key for an OpenAI-compatible provider
3. Pay per-token for API usage

There is no support for running local models via Ollama.

## Expected User Experience

```bash
# Install Ollama and pull a model
ollama pull llama3.2

# Configure CodeClaw to use Ollama
codeclaw config set agentBackend.provider ollama
codeclaw config set agentBackend.model llama3.2

# Run workflow — all agents use the local model
codeclaw run "build a login page"
```

No API key needed. No internet required. Works fully offline.

## Scope

- Add `ollamaProvider.ts` implementing AgentBackend interface
- Register Ollama provider in the provider factory
- Add `"ollama"` to AgentBackend config provider enum
- Agent calls use Ollama's HTTP API (default `http://localhost:11434`)
- Support configurable base URL
- Handle Ollama not installed/running with clear error
- Add tests with mocked HTTP client
- Handle model download status, timeout, and errors

## Out of Scope

- Model management (download, delete, list models)
- GPU acceleration tuning
- Multi-model routing
- Streaming responses (future enhancement)
- Ollama running in Docker vs native (both work with base URL config)

## Proposed Design

### Provider

```ts
// packages/adapters/src/agentBackend/ollamaProvider.ts
export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeoutMs: number | undefined;
}

export function createOllamaProvider(config: OllamaConfig): AgentBackend;
```

The provider:
1. Checks availability by calling `GET /api/tags` on the Ollama server
2. Generates content by calling `POST /api/generate` with the prompt
3. Returns markdown content in the same format as OpenAI provider
4. Handles model not found, Ollama not running, and timeout errors

### Config

```json
{
  "agentBackend": {
    "provider": "ollama",
    "model": "llama3.2",
    "baseUrl": "http://localhost:11434",
    "apiKeyEnv": "CODECLAW_OPENAI_API_KEY",
    "timeoutMs": 120000
  }
}
```

For Ollama, `apiKeyEnv` is not used but should be accepted for config compatibility.

### Factory Update

```ts
// packages/core/src/agents/agentBackendRunner.ts
if (config.provider === "ollama") {
  cachedBackend = createOllamaProvider({
    baseUrl: config.baseUrl,
    model: config.model,
    timeoutMs: config.timeoutMs,
  });
  return cachedBackend;
}
```

### Config Schema Update

```ts
// packages/shared/src/schemas/config.schema.ts
const agentBackendConfigSchema = z.object({
  provider: z.enum(["openai-compatible", "ollama", "mock", "none"]).default("none"),
  ...
});
```

## Suggested Files To Create

- `packages/adapters/src/agentBackend/ollamaProvider.ts`
- `packages/adapters/src/agentBackend/ollamaProvider.test.ts`

## Suggested Files To Modify

- `packages/shared/src/schemas/config.schema.ts` — add `"ollama"` to provider enum
- `packages/shared/src/types/domain.ts` — update `AgentBackendConfig` provider union
- `packages/core/src/agents/agentBackendRunner.ts` — add Ollama provider creation
- `packages/adapters/src/index.ts` — export `createOllamaProvider`

## Data Model / Types / Schemas

```ts
// packages/shared/src/types/domain.ts
export interface AgentBackendConfig {
  provider: "openai-compatible" | "ollama" | "mock" | "none";
  model: string;
  baseUrl: string;
  apiKeyEnv: string;
  timeoutMs: number;
}
```

## CLI Changes

- `codeclaw config set agentBackend.provider ollama` — works with existing config commands
- `codeclaw doctor` — should check Ollama availability when provider is ollama

## API / Server Changes

No API changes needed. Server reads config.json.

## Web UI Changes

Settings page should show "Ollama" as a provider option when it exists (future step).

## Storage Changes

No storage changes.

## Rust Runner / Native Execution Changes

Not required for this step — Ollama API calls are HTTPS, not command execution.

## Security Considerations

- Ollama API is localhost-only by default — safe
- No API key needed — eliminates key management risk
- `baseUrl` is a safe config value (no secrets)
- Ollama responses may contain user data — must be redacted if logged (use existing `redactSecrets`)
- If user configures Ollama on a remote host, network traffic is unencrypted (Ollama doesn't support HTTPS natively) — document this risk

## Backward Compatibility

- Existing `openai-compatible` and `mock` and `none` providers continue to work unchanged
- Config schema adds `"ollama"` as a new enum value — existing configs without it are unaffected
- Default provider remains `"none"`

## Detailed Implementation Plan

1. **Add `"ollama"` to config schema** — update `agentBackendConfigSchema.provider` enum and `AgentBackendConfig` type
2. **Create Ollama provider** — implement `createOllamaProvider()` following the pattern of `openaiCompatibleProvider.ts`
3. **Register in factory** — add Ollama case to `agentBackendRunner.ts`
4. **Export** — add `createOllamaProvider` to adapters index
5. **Add tests** — mock HTTP fetch to test availability, generation, model-not-found, timeout
6. **Run verification** — `pnpm test`, `pnpm lint`, `pnpm typecheck`

## Tests To Add

- `packages/adapters/src/agentBackend/ollamaProvider.test.ts`
  - Availability check when Ollama is running
  - Availability check when Ollama is not running (fetch rejected)
  - Generate returns content
  - Model not found error
  - Timeout handling
  - Correct request URL and body construction (mock fetch)

## Verification Commands

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Acceptance Criteria

- Ollama provider is selectable via `agentBackend.provider: "ollama"`
- Provider detects whether Ollama is running via `GET /api/tags`
- Provider generates content via `POST /api/generate`
- Missing Ollama returns available=false with clear reason
- Model not found returns available=false or generation error
- Timeout is handled gracefully
- No API key required
- All existing tests pass

## Risks

- Ollama `POST /api/generate` returns a streaming JSON response — the provider must handle this by reading the full stream and concatenating response chunks
- Ollama may return partial output if the model is interrupted — the provider should check the `done` field in the last response chunk
- Ollama API format differs from OpenAI — the provider must use the correct request/response format
- Local model inference is slower than cloud APIs — users may need to increase `timeoutMs`
- Some models may not be instruction-tuned and produce poor results — document recommended models

## Dependencies

- AgentBackend interface (already implemented)
- AgentBackend runner (already implemented)
- Config schema (already implemented — needs enum update)

## Notes For Next OpenCode Run

1. Read `packages/adapters/src/agentBackend/openaiCompatibleProvider.ts` first as a reference
2. The key difference: Ollama uses `POST /api/generate` with streaming JSON, not `POST /chat/completions`
3. Ollama streaming JSON sends one JSON object per line, ending with `{"done": true}`
4. To handle streaming, read the response as text line by line, parse each JSON line, and concatenate the `response` field
5. Use the `POST /api/tags` endpoint for availability check (non-streaming, returns model list)
6. The `createOllamaProvider` function should have the same interface as `createOpenAiCompatibleProvider`
7. After creation, run `ollama serve` and `ollama pull llama3.2` for manual testing if needed
