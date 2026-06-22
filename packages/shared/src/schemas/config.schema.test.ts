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
});
