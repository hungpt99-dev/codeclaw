import { describe, it, expect } from "vitest";
import { getAiToolConfig } from "./workflowHelpers.js";

describe("getAiToolConfig", () => {
  const agentMapping = {
    defaultBa: "claude",
    defaultArchitect: "codex",
    defaultPm: "gemini",
    defaultQa: "aider",
    defaultReporter: "claude",
  };

  const cliConfigs = {
    claude: { enabled: true, command: "claude", timeoutSeconds: 300 },
    codex: { enabled: true, command: "codex", timeoutSeconds: 300 },
    gemini: { enabled: false, command: "gemini", timeoutSeconds: 300 },
    aider: { enabled: true, command: "aider", timeoutSeconds: 600 },
  };

  it("returns config when tool is enabled", () => {
    const result = getAiToolConfig("BA", agentMapping, cliConfigs);
    expect(result).toBeDefined();
    expect(result?.tool).toBe("claude");
    expect(result?.command).toBe("claude");
    expect(result?.timeoutSeconds).toBe(300);
  });

  it("returns undefined when tool is disabled", () => {
    const result = getAiToolConfig("PROJECT_MANAGER", agentMapping, cliConfigs);
    expect(result).toBeUndefined();
  });

  it("returns undefined for unmapped roles", () => {
    const result = getAiToolConfig("DEVELOPER", agentMapping, cliConfigs);
    expect(result).toBeUndefined();
  });

  it("returns undefined when agentMapping is missing the role", () => {
    const result = getAiToolConfig("BA", {}, cliConfigs);
    expect(result).toBeUndefined();
  });
});
