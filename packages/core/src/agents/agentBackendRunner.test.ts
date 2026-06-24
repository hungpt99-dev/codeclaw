import { describe, it, expect, beforeEach } from "vitest";
import { clearAgentBackendCache, runWithAgentBackend } from "./agentBackendRunner.js";

describe("agentBackendRunner", () => {
  beforeEach(() => {
    clearAgentBackendCache();
  });

  it("returns null when provider is none", async () => {
    const result = await runWithAgentBackend({
      config: {
        provider: "none",
        model: "gpt-4o-mini",
        baseUrl: "https://api.openai.com/v1",
        apiKeyEnv: "CODECLAW_OPENAI_API_KEY",
        timeoutMs: 60000,
      },
      agentId: "BA",
      agentName: "Business Analyst",
      systemPrompt: "You are a BA",
      userPrompt: "Analyze this",
      context: { requirement: "test" },
      outputFormat: "markdown",
    });

    expect(result).toBeNull();
  });

  it("returns content from mock provider", async () => {
    const result = await runWithAgentBackend({
      config: {
        provider: "mock",
        model: "mock-model",
        baseUrl: "http://localhost",
        apiKeyEnv: "NONEXISTENT_KEY",
        timeoutMs: 1000,
      },
      agentId: "ARCHITECT",
      agentName: "Architect",
      systemPrompt: "Design",
      userPrompt: "Create architecture",
      context: {},
      outputFormat: "markdown",
    });

    expect(result).not.toBeNull();
    expect(result?.backendId).toBe("mock");
    expect(result?.content).toContain("Architect Output");
  });

  it("caches the backend instance", async () => {
    const result1 = await runWithAgentBackend({
      config: {
        provider: "mock",
        model: "mock-model",
        baseUrl: "http://localhost",
        apiKeyEnv: "NONEXISTENT_KEY",
        timeoutMs: 1000,
      },
      agentId: "BA",
      agentName: "BA",
      systemPrompt: "test",
      userPrompt: "test",
      context: {},
      outputFormat: "markdown",
    });

    const result2 = await runWithAgentBackend({
      config: {
        provider: "mock",
        model: "mock-model",
        baseUrl: "http://localhost",
        apiKeyEnv: "NONEXISTENT_KEY",
        timeoutMs: 1000,
      },
      agentId: "BA",
      agentName: "BA",
      systemPrompt: "test",
      userPrompt: "test",
      context: {},
      outputFormat: "markdown",
    });

    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
  });

  it("returns null when openai key is missing", async () => {
    const originalKey = process.env.CODECLAW_OPENAI_API_KEY;
    delete process.env.CODECLAW_OPENAI_API_KEY;

    const result = await runWithAgentBackend({
      config: {
        provider: "openai-compatible",
        model: "gpt-4o-mini",
        baseUrl: "https://api.openai.com/v1",
        apiKeyEnv: "CODECLAW_OPENAI_API_KEY",
        timeoutMs: 1000,
      },
      agentId: "BA",
      agentName: "BA",
      systemPrompt: "test",
      userPrompt: "test",
      context: {},
      outputFormat: "markdown",
    });

    expect(result).toBeNull();

    if (originalKey) {
      process.env.CODECLAW_OPENAI_API_KEY = originalKey;
    }
  });
});
