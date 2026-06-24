import { describe, it, expect } from "vitest";
import { createAdapter } from "../adapterFactory.js";

describe("adapterFactory", () => {
  it("returns null for disabled adapter", () => {
    const adapter = createAdapter("claude", {
      enabled: false,
      command: "claude",
      timeoutSeconds: 300,
    });
    expect(adapter).toBeNull();
  });

  it("returns claude adapter when enabled", () => {
    const adapter = createAdapter("claude", {
      enabled: true,
      command: "claude",
      timeoutSeconds: 300,
    });
    expect(adapter).not.toBeNull();
    expect(adapter?.name).toBe("claude");
  });

  it("returns codex adapter when enabled", () => {
    const adapter = createAdapter("codex", {
      enabled: true,
      command: "codex",
      timeoutSeconds: 300,
    });
    expect(adapter).not.toBeNull();
    expect(adapter?.name).toBe("codex");
  });

  it("returns gemini adapter when enabled", () => {
    const adapter = createAdapter("gemini", {
      enabled: true,
      command: "gemini",
      timeoutSeconds: 300,
    });
    expect(adapter).not.toBeNull();
    expect(adapter?.name).toBe("gemini");
  });

  it("returns aider adapter when enabled", () => {
    const adapter = createAdapter("aider", {
      enabled: true,
      command: "aider",
      timeoutSeconds: 300,
    });
    expect(adapter).not.toBeNull();
    expect(adapter?.name).toBe("aider");
  });

  it("returns null for unknown adapter name at runtime", () => {
    const adapter = createAdapter("unknown" as "claude", {
      enabled: true,
      command: "unknown",
      timeoutSeconds: 300,
    });
    expect(adapter).toBeNull();
  });
});
