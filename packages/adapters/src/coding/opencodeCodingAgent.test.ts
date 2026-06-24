import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExeca } = vi.hoisted(() => {
  const mockExeca = vi.fn();
  return { mockExeca };
});

vi.mock("execa", () => ({
  execa: mockExeca,
}));

import { createOpenCodeCodingAgent } from "./opencodeCodingAgent.js";

describe("opencodeCodingAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has correct id and name", () => {
    const agent = createOpenCodeCodingAgent({ command: undefined, timeoutMs: undefined });
    expect(agent.id).toBe("opencode");
    expect(agent.name).toBe("OpenCode CLI");
  });

  it("checkAvailability returns not available when which fails", async () => {
    mockExeca.mockRejectedValue(new Error("command not found"));

    const agent = createOpenCodeCodingAgent({ command: undefined, timeoutMs: undefined });
    const result = await agent.checkAvailability();

    expect(result.available).toBe(false);
    expect(result.reason).toContain("not found in PATH");
  });

  it("checkAvailability returns available when which succeeds", async () => {
    mockExeca
      .mockResolvedValueOnce({ exitCode: 0 })
      .mockResolvedValueOnce({ exitCode: 0, stdout: "1.0.0" });

    const agent = createOpenCodeCodingAgent({ command: undefined, timeoutMs: undefined });
    const result = await agent.checkAvailability();

    expect(result.available).toBe(true);
    expect(result.version).toBe("1.0.0");
  });

  it("dry run does not execute real command", async () => {
    const agent = createOpenCodeCodingAgent({ command: undefined, timeoutMs: undefined });
    const result = await agent.run({
      runId: "test-run",
      projectRoot: "/tmp",
      prompt: "test prompt",
      dryRun: true,
      timeoutMs: undefined,
      env: undefined,
    });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("DRY RUN");
  });
});
