import { describe, it, expect } from "vitest";
import { createClaudeCodeAdapter } from "./claudeCodeAdapter.js";

describe("claudeCodeAdapter", () => {
  it("has name claude", () => {
    const adapter = createClaudeCodeAdapter();
    expect(adapter.name).toBe("claude");
  });

  it("isAvailable returns boolean", async () => {
    const adapter = createClaudeCodeAdapter();
    const available = await adapter.isAvailable();
    expect(typeof available).toBe("boolean");
  });
});
