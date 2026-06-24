import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRunCommand } = vi.hoisted(() => {
  const mockRunCommand = vi.fn();
  return { mockRunCommand };
});

vi.mock("@codeclaw/native-runner", () => {
  const NativeRunnerClient = vi.fn(() => ({
    runCommand: mockRunCommand,
    checkAvailability: vi.fn(),
    gitStatus: vi.fn(),
    gitDiff: vi.fn(),
  }));
  return { NativeRunnerClient };
});

import { checkStatus, testConnection, createPR, readCIRun, readPRStatus } from "./gitHubAdapter.js";

function okResponse(stdout: string) {
  return {
    success: true,
    action: "run-command" as const,
    exitCode: 0,
    stdout,
    stderr: "",
    startedAt: "",
    endedAt: "",
    durationMs: 10,
    timedOut: false,
    cancelled: false,
    redacted: false,
    error: null,
  };
}

function failResponse(exitCode: number, stderr: string) {
  return {
    success: false,
    action: "run-command" as const,
    exitCode,
    stdout: "",
    stderr,
    startedAt: "",
    endedAt: "",
    durationMs: 10,
    timedOut: false,
    cancelled: false,
    redacted: false,
    error: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("gitHubAdapter", () => {
  describe("checkStatus", () => {
    it("returns not_available when not enabled", async () => {
      const result = await checkStatus({ enabled: false });
      expect(result.overall).toBe("not_available");
      expect(result.ghCliAvailable).toBe(false);
    });

    it("returns not_available when gh not installed", async () => {
      mockRunCommand.mockRejectedValue(new Error("not found"));
      const result = await checkStatus({ enabled: true });
      expect(result.overall).toBe("not_available");
      expect(result.ghCliAvailable).toBe(false);
    });

    it("returns ok when gh is available and authenticated", async () => {
      mockRunCommand
        .mockResolvedValueOnce(okResponse(""))
        .mockResolvedValueOnce(okResponse(""))
        .mockResolvedValueOnce(okResponse("gh version 2.0.0"))
        .mockResolvedValueOnce(
          okResponse(JSON.stringify({ name: "test-repo", owner: { login: "test-owner" } })),
        );
      const result = await checkStatus({ enabled: true });
      expect(result.overall).toBe("ok");
      expect(result.ghCliAvailable).toBe(true);
      expect(result.ghAuthenticated).toBe(true);
      expect(result.currentRepo).toEqual({ owner: "test-owner", repo: "test-repo" });
    });

    it("returns not_authenticated when gh not authenticated", async () => {
      mockRunCommand
        .mockResolvedValueOnce(okResponse(""))
        .mockResolvedValueOnce(failResponse(1, "not authenticated"));
      const result = await checkStatus({ enabled: true });
      expect(result.overall).toBe("not_authenticated");
      expect(result.ghCliAvailable).toBe(true);
      expect(result.ghAuthenticated).toBe(false);
    });
  });

  describe("testConnection", () => {
    it("fails when not enabled", async () => {
      const result = await testConnection({ enabled: false });
      expect(result.success).toBe(false);
      expect(result.message).toContain("not enabled");
    });

    it("fails when gh not installed", async () => {
      mockRunCommand.mockRejectedValue(new Error("not found"));
      const result = await testConnection({ enabled: true });
      expect(result.success).toBe(false);
      expect(result.message).toContain("not installed");
    });

    it("succeeds when authenticated with repo", async () => {
      mockRunCommand
        .mockResolvedValueOnce(okResponse(""))
        .mockResolvedValueOnce(okResponse(""))
        .mockResolvedValueOnce(
          okResponse(JSON.stringify({ name: "repo", owner: { login: "owner" } })),
        );
      const result = await testConnection({ enabled: true });
      expect(result.success).toBe(true);
      expect(result.message).toContain("owner/repo");
    });
  });

  describe("createPR", () => {
    it("creates a PR and returns url", async () => {
      mockRunCommand.mockResolvedValueOnce(
        okResponse(JSON.stringify({ url: "https://github.com/owner/repo/pull/42", number: 42 })),
      );
      const result = await createPR({
        runId: "run_123",
        title: "Test PR",
        body: "Test body",
      });
      expect(result.success).toBe(true);
      expect(result.prUrl).toBe("https://github.com/owner/repo/pull/42");
    });

    it("handles failure", async () => {
      mockRunCommand.mockRejectedValueOnce(new Error("git error"));
      const result = await createPR({
        runId: "run_123",
        title: "Test PR",
        body: "Test body",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("readCIRun", () => {
    it("returns empty array when gh fails", async () => {
      mockRunCommand.mockRejectedValue(new Error("not available"));
      const result = await readCIRun();
      expect(result).toEqual([]);
    });

    it("parses CI runs", async () => {
      mockRunCommand.mockResolvedValueOnce(
        okResponse(
          JSON.stringify([
            { name: "CI", status: "completed", conclusion: "success", url: "https://example.com" },
          ]),
        ),
      );
      const result = await readCIRun();
      expect(result).toHaveLength(1);
      expect(result[0]?.workflow).toBe("CI");
      expect(result[0]?.status).toBe("completed");
    });
  });

  describe("readPRStatus", () => {
    it("returns empty when gh fails", async () => {
      mockRunCommand.mockRejectedValue(new Error("not available"));
      const result = await readPRStatus();
      expect(result).toEqual([]);
    });

    it("parses PR list", async () => {
      mockRunCommand.mockResolvedValueOnce(
        okResponse(
          JSON.stringify([
            {
              state: "OPEN",
              title: "Test PR",
              url: "https://github.com/owner/repo/pull/1",
              number: 1,
            },
          ]),
        ),
      );
      const result = await readPRStatus();
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Test PR");
    });
  });
});
