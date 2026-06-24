import { describe, it, expect } from "vitest";
import { createOpenCodeAdapter } from "./opencodeAdapter.js";

describe("opencodeAdapter", () => {
  it("has name opencode", () => {
    const adapter = createOpenCodeAdapter();
    expect(adapter.name).toBe("opencode");
  });

  it("isAvailable returns boolean", async () => {
    const adapter = createOpenCodeAdapter();
    const available = await adapter.isAvailable();
    expect(typeof available).toBe("boolean");
  });

  it("accepts custom config", () => {
    const adapter = createOpenCodeAdapter({
      command: "opencode",
      timeoutSeconds: 600,
    });
    expect(adapter.name).toBe("opencode");
  });
});
