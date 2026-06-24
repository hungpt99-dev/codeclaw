import type {
  AgentBackend,
  AgentBackendAvailability,
  AgentGenerateInput,
  AgentGenerateResult,
} from "./types.js";

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeoutMs: number | undefined;
}

interface OllamaTagsResponse {
  models: {
    name: string;
    modified_at: string;
    size: number;
  }[];
}

interface OllamaGenerateResponseLine {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system: string;
  stream: boolean;
  options: {
    temperature: number;
  };
}

async function readStream(
  response: Response,
  signal: AbortSignal,
): Promise<{ content: string; evalCount: number | undefined }> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let content = "";
  let evalCount: number | undefined;
  let buffer = "";

  try {
    for (;;) {
      if (signal.aborted) {
        throw new Error("Request timed out");
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const parsed = JSON.parse(trimmed) as OllamaGenerateResponseLine;
        content += parsed.response;

        if (parsed.eval_count !== undefined) {
          evalCount = parsed.eval_count;
        }

        if (parsed.done) break;
      }
    }

    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim()) as OllamaGenerateResponseLine;
        content += parsed.response;
        if (parsed.eval_count !== undefined) {
          evalCount = parsed.eval_count;
        }
      } catch {
        // ignore parse errors on trailing data
      }
    }
  } finally {
    // reader resources cleaned up by GC
  }

  return { content, evalCount };
}

export function createOllamaProvider(config: OllamaConfig): AgentBackend {
  async function checkAvailability(): Promise<AgentBackendAvailability> {
    try {
      const controller = new AbortController();
      const timeoutMs = config.timeoutMs ?? 60000;
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      const response = await fetch(`${config.baseUrl}/api/tags`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          available: false,
          reason: `Ollama server returned status ${String(response.status)}`,
          version: undefined,
        };
      }

      const data = (await response.json()) as OllamaTagsResponse;
      const modelName = config.model;
      const modelExists = data.models.some(
        (m) => m.name === modelName || m.name.startsWith(`${modelName}:`),
      );

      if (!modelExists) {
        return {
          available: false,
          reason: `Model "${modelName}" not found in Ollama. Run: ollama pull ${modelName}`,
          version: undefined,
        };
      }

      return { available: true, reason: undefined, version: modelName };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("aborted") || message.includes("timed out")) {
        return {
          available: false,
          reason: `Ollama server did not respond within ${String((config.timeoutMs ?? 60000) / 1000)}s`,
          version: undefined,
        };
      }
      return {
        available: false,
        reason: `Cannot connect to Ollama at ${config.baseUrl}. Is Ollama running? (ollama serve)`,
        version: undefined,
      };
    }
  }

  async function generate(input: AgentGenerateInput): Promise<AgentGenerateResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    const combinedPrompt = `${input.systemPrompt}\n\n${input.userPrompt}`;

    const requestBody: OllamaGenerateRequest = {
      model: config.model,
      prompt: combinedPrompt,
      system: input.systemPrompt,
      stream: true,
      options: {
        temperature: 0.3,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutMs = config.timeoutMs ?? 120000;
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      const response = await fetch(`${config.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
          backendId: `ollama:${config.model}`,
          content: "",
          rawOutput: errorBody,
          usage: undefined,
          startedAt,
          endedAt,
          durationMs,
        };
      }

      const { content, evalCount } = await readStream(response, controller.signal);
      const endedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      return {
        backendId: `ollama:${config.model}`,
        content,
        rawOutput: undefined,
        usage: {
          inputTokens: undefined,
          outputTokens: evalCount,
          totalTokens: undefined,
        },
        startedAt,
        endedAt,
        durationMs,
      };
    } catch (err) {
      const endedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      return {
        backendId: `ollama:${config.model}`,
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
    id: `ollama:${config.model}`,
    name: `Ollama (${config.model})`,
    type: "llm-provider",
    checkAvailability,
    generate,
  };
}
