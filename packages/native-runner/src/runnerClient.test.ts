import { describe, it, expect, vi, beforeEach } from "vitest";
import { NativeRunnerClient } from "./runnerClient.js";

describe("NativeRunnerClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fullRunOptions = {
    command: "echo",
    args: undefined as string[] | undefined,
    cwd: "/tmp",
    timeoutMs: undefined as number | undefined,
    env: undefined as Record<string, string> | undefined,
    policy: undefined,
    captureStdout: undefined as boolean | undefined,
    captureStderr: undefined as boolean | undefined,
    redactSecrets: undefined as boolean | undefined,
  };

  const fullGitStatusOptions = {
    cwd: "/tmp",
    timeoutMs: undefined as number | undefined,
    redactSecrets: undefined as boolean | undefined,
  };

  const fullGitDiffOptions = {
    cwd: "/tmp",
    timeoutMs: undefined as number | undefined,
    redactSecrets: undefined as boolean | undefined,
    staged: undefined as boolean | undefined,
  };

  it("reports not available via runCommand when runner is missing", async () => {
    const client = new NativeRunnerClient("definitely-does-not-exist-12345");
    client.checkAvailability = vi.fn().mockResolvedValue({
      available: false,
      path: "definitely-does-not-exist-12345",
      reason: "Native runner not found. Build or install it before running commands.",
    });

    const result = await client.runCommand(fullRunOptions);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("RUNNER_NOT_FOUND");
  });

  it("handles runner not found in gitStatus", async () => {
    const client = new NativeRunnerClient("definitely-does-not-exist-12345");
    client.checkAvailability = vi.fn().mockResolvedValue({
      available: false,
      path: "definitely-does-not-exist-12345",
      reason: "Native runner not found",
    });

    const result = await client.gitStatus(fullGitStatusOptions);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("RUNNER_NOT_FOUND");
  });

  it("handles runner not found in gitDiff", async () => {
    const client = new NativeRunnerClient("definitely-does-not-exist-12345");
    client.checkAvailability = vi.fn().mockResolvedValue({
      available: false,
      path: "definitely-does-not-exist-12345",
      reason: "Native runner not found",
    });

    const result = await client.gitDiff(fullGitDiffOptions);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("RUNNER_NOT_FOUND");
  });
});
