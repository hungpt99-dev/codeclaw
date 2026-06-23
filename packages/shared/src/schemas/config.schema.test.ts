import { describe, it, expect } from "vitest";
import { configSchema, defaultConfig } from "./config.schema.js";

describe("configSchema", () => {
  it("accepts the default config", () => {
    const result = configSchema.safeParse(defaultConfig);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid defaultMode", () => {
    const result = configSchema.safeParse({
      ...defaultConfig,
      workflow: { ...defaultConfig.workflow, defaultMode: "invalid-mode" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative maxIterations", () => {
    const result = configSchema.safeParse({
      ...defaultConfig,
      safety: { ...defaultConfig.safety, maxIterations: -1 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero maxIterations", () => {
    const result = configSchema.safeParse({
      ...defaultConfig,
      safety: { ...defaultConfig.safety, maxIterations: 0 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = configSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean generateTraceability", () => {
    const result = configSchema.safeParse({
      ...defaultConfig,
      workflow: { ...defaultConfig.workflow, generateTraceability: "yes" },
    });
    expect(result.success).toBe(false);
  });

  it("includes agents section with default values", () => {
    const result = configSchema.safeParse(defaultConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agents.defaultBa).toBe("claude");
      expect(result.data.agents.defaultArchitect).toBe("claude");
      expect(result.data.agents.defaultPm).toBe("claude");
      expect(result.data.agents.defaultQa).toBe("claude");
      expect(result.data.agents.defaultReporter).toBe("claude");
    }
  });

  it("includes cli section with default values", () => {
    const result = configSchema.safeParse(defaultConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cli.claude.command).toBe("claude");
      expect(result.data.cli.codex.command).toBe("codex");
      expect(result.data.cli.gemini.command).toBe("gemini");
      expect(result.data.cli.aider.command).toBe("aider");
    }
  });

  it("accepts valid agent tool values", () => {
    const config = {
      ...defaultConfig,
      agents: {
        ...defaultConfig.agents,
        defaultBa: "gemini",
        defaultArchitect: "codex",
        defaultPm: "aider",
        defaultQa: "gemini",
        defaultReporter: "claude",
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("rejects invalid agent tool values", () => {
    const config = {
      ...defaultConfig,
      agents: {
        ...defaultConfig.agents,
        defaultBa: "invalid-tool",
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
