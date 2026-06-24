import { describe, it, expect } from "vitest";
import { createGeminiAdapter } from "./geminiAdapter.js";

describe("geminiAdapter", () => {
  it("has name gemini", () => {
    const adapter = createGeminiAdapter();
    expect(adapter.name).toBe("gemini");
  });

  it("isAvailable returns boolean", async () => {
    const adapter = createGeminiAdapter();
    const available = await adapter.isAvailable();
    expect(typeof available).toBe("boolean");
  });
});
