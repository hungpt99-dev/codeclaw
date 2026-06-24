import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOllamaProvider } from "./ollamaProvider.js";

function createMockFetch(): ReturnType<typeof vi.fn> {
  return vi.fn();
}

interface TagsModel {
  name: string;
  modified_at: string;
  size: number;
}

interface TagsResponse {
  models: TagsModel[];
}

function createTagsResponse(models: string[]): TagsResponse {
  return {
    models: models.map((name) => ({
      name,
      modified_at: "2024-01-01T00:00:00Z",
      size: 1000000000,
    })),
  };
}

interface GenerateChunk {
  response: string;
  done: boolean;
}

function createGenerateStream(chunks: GenerateChunk[]): string {
  return chunks
    .map((c) =>
      JSON.stringify({
        model: "llama3.2",
        created_at: "2024-01-01T00:00:00Z",
        response: c.response,
        done: c.done,
      }),
    )
    .join("\n");
}

interface MockReader {
  read: ReturnType<typeof vi.fn>;
}

function createMockReader(body: string): MockReader {
  return {
    read: vi
      .fn()
      .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(body) })
      .mockResolvedValueOnce({ done: true, value: undefined }),
  };
}

describe("ollamaProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("checkAvailability", () => {
    it("returns available when Ollama is running and model exists", async () => {
      const mockFetch = createMockFetch();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createTagsResponse(["llama3.2", "mistral"])),
      });
      vi.stubGlobal("fetch", mockFetch);

      const provider = createOllamaProvider({
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
        timeoutMs: undefined,
      });

      const availability = await provider.checkAvailability();
      expect(availability.available).toBe(true);
      expect(availability.version).toBe("llama3.2");
      expect(mockFetch).toHaveBeenCalledWith("http://localhost:11434/api/tags", {
        method: "GET",
        signal: expect.any(AbortSignal) as AbortSignal,
      });
    });

    it("returns not available when model is not found", async () => {
      const mockFetch = createMockFetch();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createTagsResponse(["mistral", "codellama"])),
      });
      vi.stubGlobal("fetch", mockFetch);

      const provider = createOllamaProvider({
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
        timeoutMs: undefined,
      });

      const availability = await provider.checkAvailability();
      expect(availability.available).toBe(false);
      expect(availability.reason).toContain("ollama pull llama3.2");
    });

    it("returns not available when Ollama is not running", async () => {
      const mockFetch = createMockFetch();
      mockFetch.mockRejectedValueOnce(new Error("fetch failed"));
      vi.stubGlobal("fetch", mockFetch);

      const provider = createOllamaProvider({
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
        timeoutMs: undefined,
      });

      const availability = await provider.checkAvailability();
      expect(availability.available).toBe(false);
      expect(availability.reason).toContain("Is Ollama running");
    });

    it("returns not available when Ollama returns error status", async () => {
      const mockFetch = createMockFetch();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });
      vi.stubGlobal("fetch", mockFetch);

      const provider = createOllamaProvider({
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
        timeoutMs: undefined,
      });

      const availability = await provider.checkAvailability();
      expect(availability.available).toBe(false);
      expect(availability.reason).toContain("status 500");
    });
  });

  describe("generate", () => {
    it("returns content from streaming response", async () => {
      const mockFetch = createMockFetch();
      const streamBody = createGenerateStream([
        { response: "Hello", done: false },
        { response: " world", done: false },
        { response: "!", done: true },
      ]);
      const reader = createMockReader(streamBody);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => reader },
      });
      vi.stubGlobal("fetch", mockFetch);

      const provider = createOllamaProvider({
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
        timeoutMs: undefined,
      });

      const result = await provider.generate({
        agentId: "TEST",
        agentName: "Test Agent",
        systemPrompt: "You are a test assistant",
        userPrompt: "Say hello",
        context: {},
        outputFormat: "markdown",
        timeoutMs: undefined,
      });

      expect(result.content).toBe("Hello world!");
      expect(result.backendId).toBe("ollama:llama3.2");
      expect(result.usage?.outputTokens).toBeUndefined();
    });

    it("handles HTTP error during generation", async () => {
      const mockFetch = createMockFetch();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("model not found"),
      });
      vi.stubGlobal("fetch", mockFetch);

      const provider = createOllamaProvider({
        baseUrl: "http://localhost:11434",
        model: "nonexistent-model",
        timeoutMs: undefined,
      });

      const result = await provider.generate({
        agentId: "TEST",
        agentName: "Test Agent",
        systemPrompt: "test",
        userPrompt: "test",
        context: {},
        outputFormat: "markdown",
        timeoutMs: undefined,
      });

      expect(result.content).toBe("");
      expect(result.rawOutput).toBe("model not found");
    });

    it("handles network error during generation", async () => {
      const mockFetch = createMockFetch();
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      vi.stubGlobal("fetch", mockFetch);

      const provider = createOllamaProvider({
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
        timeoutMs: undefined,
      });

      const result = await provider.generate({
        agentId: "TEST",
        agentName: "Test Agent",
        systemPrompt: "test",
        userPrompt: "test",
        context: {},
        outputFormat: "markdown",
        timeoutMs: undefined,
      });

      expect(result.content).toBe("");
      expect(result.rawOutput).toBe("Network error");
    });

    it("correctly constructs the request body", async () => {
      const mockFetch = createMockFetch();
      const reader = createMockReader(
        JSON.stringify({ model: "llama3.2", response: "ok", done: true }),
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => reader },
      });
      vi.stubGlobal("fetch", mockFetch);

      const provider = createOllamaProvider({
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
        timeoutMs: undefined,
      });

      await provider.generate({
        agentId: "TEST",
        agentName: "Test Agent",
        systemPrompt: "You are helpful",
        userPrompt: "Hi there",
        context: { key: "value" },
        outputFormat: "markdown",
        timeoutMs: undefined,
      });

      const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(fetchCall[0]).toBe("http://localhost:11434/api/generate");
      expect(fetchCall[1].method).toBe("POST");
      expect(fetchCall[1].headers).toEqual({ "Content-Type": "application/json" });
      expect(fetchCall[1].signal).toBeInstanceOf(AbortSignal);

      const callBody = JSON.parse(fetchCall[1].body as string) as {
        model: string;
        stream: boolean;
        options: { temperature: number };
      };
      expect(callBody.model).toBe("llama3.2");
      expect(callBody.stream).toBe(true);
      expect(callBody.options.temperature).toBe(0.3);
    });
  });

  describe("identity", () => {
    it("has correct id and type", () => {
      const provider = createOllamaProvider({
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
        timeoutMs: undefined,
      });

      expect(provider.id).toBe("ollama:llama3.2");
      expect(provider.type).toBe("llm-provider");
      expect(provider.name).toContain("llama3.2");
    });
  });
});
