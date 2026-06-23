import { describe, it, expect } from "vitest";
import { runAgent, renderPrompt } from "./agentRunner.js";

describe("renderPrompt", () => {
  it("replaces placeholders with context values", () => {
    expect(renderPrompt("Hello {{name}}!", { name: "World" })).toBe("Hello World!");
  });

  it("leaves unmatched placeholders unchanged", () => {
    expect(renderPrompt("Hello {{name}}!", {})).toBe("Hello {{name}}!");
  });
});

describe("runAgent", () => {
  it("returns deterministic fallback when no AI tool config provided", async () => {
    const result = await runAgent({
      role: "BA",
      promptTemplate: "Hello {{name}}!",
      context: { name: "World" },
    });

    expect(result.success).toBe(true);
    expect(result.output).toBe("Hello World!");
    expect(result.usedAi).toBe(false);
  });

  it("uses AI tool when config is provided but CLI may not exist", async () => {
    const result = await runAgent({
      role: "BA",
      promptTemplate: "Hello {{name}}!",
      context: { name: "World" },
      aiToolConfig: {
        tool: "claude",
        command: "nonexistent-cli-tool",
        timeoutSeconds: 5,
      },
    });

    expect(result.success).toBe(true);
    expect(result.output).toBe("Hello World!");
    expect(result.usedAi).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
