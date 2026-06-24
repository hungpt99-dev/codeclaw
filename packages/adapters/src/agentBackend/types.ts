export interface AgentBackend {
  id: string;
  name: string;
  type: "llm-provider" | "cli-ai-tool" | "mock";
  checkAvailability(): Promise<AgentBackendAvailability>;
  generate(input: AgentGenerateInput): Promise<AgentGenerateResult>;
}

export interface AgentBackendAvailability {
  available: boolean;
  reason: string | undefined;
  version: string | undefined;
}

export interface AgentGenerateInput {
  agentId: string;
  agentName: string;
  systemPrompt: string;
  userPrompt: string;
  context: Record<string, unknown>;
  outputFormat: "markdown" | "json" | undefined;
  timeoutMs: number | undefined;
}

export interface AgentGenerateResult {
  backendId: string;
  content: string;
  rawOutput: string | undefined;
  usage:
    | {
        inputTokens: number | undefined;
        outputTokens: number | undefined;
        totalTokens: number | undefined;
      }
    | undefined;
  startedAt: string;
  endedAt: string;
  durationMs: number;
}
