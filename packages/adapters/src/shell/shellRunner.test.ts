import { describe, it, expect, vi, beforeEach } from "vitest";
import { runShellCommand, resetNativeRunner } from "./shellRunner.js";

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

describe("runShellCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNativeRunner();
  });

  it("executes a command and returns exit code 0", async () => {
    mockRunCommand.mockResolvedValue({
      success: true,
      action: "run-command",
      exitCode: 0,
      stdout: "hello\n",
      stderr: "",
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 10,
      timedOut: false,
      cancelled: false,
      redacted: false,
      error: null,
    });

    const result = await runShellCommand({
      command: "echo",
      args: ["hello"],
      cwd: "/tmp",
      timeoutSeconds: 10,
      stdoutPath: "/tmp/stdout.log",
      stderrPath: "/tmp/stderr.log",
    });

    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("captures non-zero exit code", async () => {
    mockRunCommand.mockResolvedValue({
      success: false,
      action: "run-command",
      exitCode: 42,
      stdout: "",
      stderr: "",
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 5,
      timedOut: false,
      cancelled: false,
      redacted: false,
      error: null,
    });

    const result = await runShellCommand({
      command: "sh",
      args: ["-c", "exit 42"],
      cwd: "/tmp",
      timeoutSeconds: 10,
      stdoutPath: "/tmp/stdout.log",
      stderrPath: "/tmp/stderr.log",
    });

    expect(result.exitCode).toBe(42);
    expect(result.timedOut).toBe(false);
  });

  it("throws on missing native runner", async () => {
    mockRunCommand.mockResolvedValue({
      success: false,
      action: "run-command",
      exitCode: null,
      stdout: null,
      stderr: null,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 0,
      timedOut: null,
      cancelled: null,
      redacted: false,
      error: { code: "RUNNER_NOT_FOUND", message: "Native runner not found" },
    });

    await expect(
      runShellCommand({
        command: "echo",
        args: ["hello"],
        cwd: "/tmp",
        timeoutSeconds: 10,
        stdoutPath: "/tmp/stdout.log",
        stderrPath: "/tmp/stderr.log",
      }),
    ).rejects.toThrow("CodeClaw native runner is required");
  });
});
