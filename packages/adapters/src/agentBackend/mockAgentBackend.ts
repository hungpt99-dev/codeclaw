import type {
  AgentBackend,
  AgentBackendAvailability,
  AgentGenerateInput,
  AgentGenerateResult,
} from "./types.js";

export function createMockAgentBackend(): AgentBackend {
  function checkAvailability(): Promise<AgentBackendAvailability> {
    return Promise.resolve({ available: true, reason: undefined, version: "mock-1.0.0" });
  }

  function generate(input: AgentGenerateInput): Promise<AgentGenerateResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    const content = `# ${input.agentName} Output (Mock)

## Summary
This is a mock response for agent "${input.agentId}" (${input.agentName}).

## Input Context
The agent received a prompt with ${String(Object.keys(input.context).length)} context keys.

## Generated Content
This deterministic mock output is produced by the MockAgentBackend.
It requires no network, no API keys, and is suitable for testing.

## Details
- Agent: ${input.agentName} (${input.agentId})
- Format: ${input.outputFormat ?? "markdown"}
- System prompt length: ${String(input.systemPrompt.length)} chars
- User prompt length: ${String(input.userPrompt.length)} chars
`;

    const endedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    return Promise.resolve({
      backendId: "mock",
      content,
      rawOutput: content,
      usage: {
        inputTokens: input.systemPrompt.length + input.userPrompt.length,
        outputTokens: content.length,
        totalTokens: input.systemPrompt.length + input.userPrompt.length + content.length,
      },
      startedAt,
      endedAt,
      durationMs,
    });
  }

  return {
    id: "mock",
    name: "Mock Agent Backend",
    type: "mock",
    checkAvailability,
    generate,
  };
}
