import { describe, it, expect } from "vitest";
import { createCodexAdapter } from "./codexAdapter.js";

describe("codexAdapter", () => {
  it("has name codex", () => {
    const adapter = createCodexAdapter();
    expect(adapter.name).toBe("codex");
  });

  it("isAvailable returns boolean", async () => {
    const adapter = createCodexAdapter();
    const available = await adapter.isAvailable();
    expect(typeof available).toBe("boolean");
  });
});
