import { describe, it, expect } from "vitest";
import { createAiderAdapter } from "./aiderAdapter.js";

describe("aiderAdapter", () => {
  it("has name aider", () => {
    const adapter = createAiderAdapter();
    expect(adapter.name).toBe("aider");
  });

  it("isAvailable returns boolean", async () => {
    const adapter = createAiderAdapter();
    const available = await adapter.isAvailable();
    expect(typeof available).toBe("boolean");
  });
});
