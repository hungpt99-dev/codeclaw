import { describe, it, expect } from "vitest";
import { runAgent, renderPrompt } from "./index.js";

describe("adapters", () => {
  it("renderPrompt replaces placeholders", () => {
    expect(renderPrompt("Hello {{name}}!", { name: "World" })).toBe("Hello World!");
  });

  it("runAgent returns fallback without AI config", async () => {
    const result = await runAgent({
      role: "BA",
      promptTemplate: "Test {{x}}",
      context: { x: "value" },
    });
    expect(result.success).toBe(true);
    expect(result.output).toBe("Test value");
    expect(result.usedAi).toBe(false);
  });
});
