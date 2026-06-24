import type { AgentBackend, AgentGenerateResult } from "@codeclaw/adapters";
import { createMockAgentBackend, createOpenAiCompatibleProvider } from "@codeclaw/adapters";
import type { AgentBackendConfig } from "@codeclaw/shared";

export interface AgentBackendRunnerInput {
  config: AgentBackendConfig;
  agentId: string;
  agentName: string;
  systemPrompt: string;
  userPrompt: string;
  context: Record<string, unknown>;
  outputFormat?: "markdown" | "json";
}

let cachedBackend: AgentBackend | null = null;

function resolveBackend(config: AgentBackendConfig): AgentBackend | null {
  if (config.provider === "none") {
    return null;
  }

  if (cachedBackend) {
    return cachedBackend;
  }

  if (config.provider === "mock") {
    cachedBackend = createMockAgentBackend();
    return cachedBackend;
  }

  cachedBackend = createOpenAiCompatibleProvider({
    baseUrl: config.baseUrl,
    model: config.model,
    apiKeyEnv: config.apiKeyEnv,
    timeoutMs: config.timeoutMs,
  });
  return cachedBackend;
}

export function clearAgentBackendCache(): void {
  cachedBackend = null;
}

export async function runWithAgentBackend(
  input: AgentBackendRunnerInput,
): Promise<AgentGenerateResult | null> {
  const backend = resolveBackend(input.config);
  if (!backend) {
    return null;
  }

  const availability = await backend.checkAvailability();
  if (!availability.available) {
    return null;
  }

  return backend.generate({
    agentId: input.agentId,
    agentName: input.agentName,
    systemPrompt: input.systemPrompt,
    userPrompt: input.userPrompt,
    context: input.context,
    outputFormat: input.outputFormat ?? "markdown",
    timeoutMs: input.config.timeoutMs,
  });
}
