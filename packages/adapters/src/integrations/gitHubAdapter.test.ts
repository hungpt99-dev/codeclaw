import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExeca } = vi.hoisted(() => {
  const mockExeca = vi.fn();
  return { mockExeca };
});

vi.mock("execa", () => ({
  execa: mockExeca,
}));

import { checkStatus, testConnection, createPR, readCIRun, readPRStatus } from "./gitHubAdapter.js";

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
      mockExeca.mockRejectedValue(new Error("not found"));
      const result = await checkStatus({ enabled: true });
      expect(result.overall).toBe("not_available");
      expect(result.ghCliAvailable).toBe(false);
    });

    it("returns ok when gh is available and authenticated", async () => {
      mockExeca
        .mockResolvedValueOnce({ exitCode: 0, stdout: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "gh version 2.0.0" })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: JSON.stringify({ name: "test-repo", owner: { login: "test-owner" } }),
        });
      const result = await checkStatus({ enabled: true });
      expect(result.overall).toBe("ok");
      expect(result.ghCliAvailable).toBe(true);
      expect(result.ghAuthenticated).toBe(true);
      expect(result.currentRepo).toEqual({ owner: "test-owner", repo: "test-repo" });
    });

    it("returns not_authenticated when gh not authenticated", async () => {
      mockExeca
        .mockResolvedValueOnce({ exitCode: 0, stdout: "" })
        .mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "not authenticated" });
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
      mockExeca.mockRejectedValue(new Error("not found"));
      const result = await testConnection({ enabled: true });
      expect(result.success).toBe(false);
      expect(result.message).toContain("not installed");
    });

    it("succeeds when authenticated with repo", async () => {
      mockExeca
        .mockResolvedValueOnce({ exitCode: 0, stdout: "" })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "" })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: JSON.stringify({ name: "repo", owner: { login: "owner" } }),
        });
      const result = await testConnection({ enabled: true });
      expect(result.success).toBe(true);
      expect(result.message).toContain("owner/repo");
    });
  });

  describe("createPR", () => {
    it("creates a PR and returns url", async () => {
      mockExeca.mockResolvedValueOnce({
        exitCode: 0,
        stdout: "https://github.com/owner/repo/pull/42",
      });
      const result = await createPR({
        runId: "run_123",
        title: "Test PR",
        body: "Test body",
      });
      expect(result.success).toBe(true);
      expect(result.prUrl).toBe("https://github.com/owner/repo/pull/42");
    });

    it("handles failure", async () => {
      mockExeca.mockRejectedValueOnce(new Error("git error"));
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
      mockExeca.mockRejectedValue(new Error("not available"));
      const result = await readCIRun();
      expect(result).toEqual([]);
    });

    it("parses CI runs", async () => {
      mockExeca.mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify([
          { workflowName: "CI", status: "completed", conclusion: "success" },
        ]),
      });
      const result = await readCIRun();
      expect(result).toHaveLength(1);
      expect(result[0]?.workflow).toBe("CI");
      expect(result[0]?.status).toBe("completed");
    });
  });

  describe("readPRStatus", () => {
    it("returns empty when gh fails", async () => {
      mockExeca.mockRejectedValue(new Error("not available"));
      const result = await readPRStatus();
      expect(result).toEqual([]);
    });

    it("parses PR list", async () => {
      mockExeca.mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify([
          {
            state: "OPEN",
            title: "Test PR",
            url: "https://github.com/owner/repo/pull/1",
            number: 1,
          },
        ]),
      });
      const result = await readPRStatus();
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Test PR");
    });
  });
});
