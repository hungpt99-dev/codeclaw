import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOpenCodeCodingAgent } from "./opencodeCodingAgent.js";

const { mockRunCommand } = vi.hoisted(() => {
  const mockRunCommand = vi.fn();
  return { mockRunCommand };
});

vi.mock("@codeclaw/native-runner", () => {
  const mockCheckAvailability = vi
    .fn()
    .mockResolvedValue({ available: true, path: "codeclaw-runner" });
  const NativeRunnerClient = vi.fn(() => ({
    runCommand: mockRunCommand,
    checkAvailability: mockCheckAvailability,
    gitStatus: vi.fn(),
    gitDiff: vi.fn(),
  }));
  return { NativeRunnerClient };
});

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
    mockRunCommand.mockResolvedValue({
      success: false,
      action: "run-command",
      exitCode: 1,
      stdout: "",
      stderr: "not found",
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 10,
      timedOut: false,
      cancelled: false,
      redacted: false,
      error: null,
    });

    const agent = createOpenCodeCodingAgent({ command: undefined, timeoutMs: undefined });
    const result = await agent.checkAvailability();

    expect(result.available).toBe(false);
    expect(result.reason).toContain("not found in PATH");
  });

  it("checkAvailability returns available when which succeeds", async () => {
    mockRunCommand
      .mockResolvedValueOnce({
        success: true,
        action: "run-command",
        exitCode: 0,
        stdout: "/usr/local/bin/opencode",
        stderr: "",
        startedAt: "",
        endedAt: "",
        durationMs: 10,
        timedOut: false,
        cancelled: false,
        redacted: false,
        error: null,
      })
      .mockResolvedValueOnce({
        success: true,
        action: "run-command",
        exitCode: 0,
        stdout: "1.0.0",
        stderr: "",
        startedAt: "",
        endedAt: "",
        durationMs: 10,
        timedOut: false,
        cancelled: false,
        redacted: false,
        error: null,
      });

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
