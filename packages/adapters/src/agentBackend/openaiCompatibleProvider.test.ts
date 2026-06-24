import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOpenAiCompatibleProvider } from "./openaiCompatibleProvider.js";

describe("openaiCompatibleProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns not available when API key is missing", async () => {
    const originalKey = process.env.CODECLAW_OPENAI_API_KEY;
    delete process.env.CODECLAW_OPENAI_API_KEY;

    const provider = createOpenAiCompatibleProvider({
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      apiKeyEnv: "CODECLAW_OPENAI_API_KEY",
      timeoutMs: undefined,
    });

    const availability = await provider.checkAvailability();
    expect(availability.available).toBe(false);
    expect(availability.reason).toContain("API key not found");

    if (originalKey) {
      process.env.CODECLAW_OPENAI_API_KEY = originalKey;
    }
  });

  it("returns available when API key is set", async () => {
    const originalKey = process.env.CODECLAW_OPENAI_API_KEY;
    process.env.CODECLAW_OPENAI_API_KEY = "sk-test-key";

    const provider = createOpenAiCompatibleProvider({
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      apiKeyEnv: "CODECLAW_OPENAI_API_KEY",
      timeoutMs: undefined,
    });

    const availability = await provider.checkAvailability();
    expect(availability.available).toBe(true);

    if (originalKey) {
      process.env.CODECLAW_OPENAI_API_KEY = originalKey;
    } else {
      delete process.env.CODECLAW_OPENAI_API_KEY;
    }
  });

  it("has correct id and type", () => {
    const provider = createOpenAiCompatibleProvider({
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      apiKeyEnv: "CODECLAW_OPENAI_API_KEY",
      timeoutMs: undefined,
    });

    expect(provider.id).toBe("openai:gpt-4o-mini");
    expect(provider.type).toBe("llm-provider");
    expect(provider.name).toContain("gpt-4o-mini");
  });
});
