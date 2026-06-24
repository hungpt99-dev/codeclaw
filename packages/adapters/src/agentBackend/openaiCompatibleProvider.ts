import type {
  AgentBackend,
  AgentBackendAvailability,
  AgentGenerateInput,
  AgentGenerateResult,
} from "./types.js";

export interface OpenAiCompatibleConfig {
  baseUrl: string;
  model: string;
  apiKeyEnv: string;
  timeoutMs: number | undefined;
}

interface OpenAiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAiChatRequest {
  model: string;
  messages: OpenAiChatMessage[];
  max_tokens: number;
  temperature: number;
}

interface OpenAiChatResponse {
  choices: {
    message: {
      content: string | null;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type: string;
  };
}

export function createOpenAiCompatibleProvider(config: OpenAiCompatibleConfig): AgentBackend {
  const apiKeyEnv = config.apiKeyEnv || "CODECLAW_OPENAI_API_KEY";

  function checkAvailability(): Promise<AgentBackendAvailability> {
    const apiKey = process.env[apiKeyEnv];
    if (!apiKey) {
      return Promise.resolve({
        available: false,
        reason: `API key not found in environment variable ${apiKeyEnv}`,
        version: undefined,
      });
    }
    return Promise.resolve({ available: true, reason: undefined, version: config.model });
  }

  async function generate(input: AgentGenerateInput): Promise<AgentGenerateResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    const apiKey = process.env[apiKeyEnv];
    if (!apiKey) {
      const endedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;
      return {
        backendId: `openai:${config.model}`,
        content: "",
        rawOutput: undefined,
        usage: undefined,
        startedAt,
        endedAt,
        durationMs,
      };
    }

    const messages: OpenAiChatMessage[] = [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.userPrompt },
    ];

    const requestBody: OpenAiChatRequest = {
      model: config.model,
      messages,
      max_tokens: 4096,
      temperature: 0.3,
    };

    try {
      const controller = new AbortController();
      const timeoutMs = config.timeoutMs ?? 60000;
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        const endedAt = new Date().toISOString();
        const durationMs = Date.now() - startTime;
        return {
          backendId: `openai:${config.model}`,
          content: "",
          rawOutput: errorBody,
          usage: undefined,
          startedAt,
          endedAt,
          durationMs,
        };
      }

      const data = (await response.json()) as OpenAiChatResponse;
      const endedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      const content = data.choices[0]?.message.content ?? "";

      return {
        backendId: `openai:${config.model}`,
        content,
        rawOutput: JSON.stringify(data),
        usage: data.usage
          ? {
              inputTokens: data.usage.prompt_tokens,
              outputTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
        startedAt,
        endedAt,
        durationMs,
      };
    } catch (err) {
      const endedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      return {
        backendId: `openai:${config.model}`,
        content: "",
        rawOutput: message,
        usage: undefined,
        startedAt,
        endedAt,
        durationMs,
      };
    }
  }

  return {
    id: `openai:${config.model}`,
    name: `OpenAI Compatible (${config.model})`,
    type: "llm-provider",
    checkAvailability,
    generate,
  };
}
