import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execa } from "execa";
import {
  getGitStatus,
  getChangedFiles,
  generateDiff,
  getDiffStats,
  resetNativeRunner,
} from "./gitService.js";

let tmpDir: string;
const mockRun = vi.fn();

vi.mock("@codeclaw/native-runner", () => ({
  NativeRunnerClient: vi.fn().mockImplementation(() => ({
    checkAvailability: vi.fn().mockResolvedValue({ available: true, path: "codeclaw-runner" }),
    runCommand: mockRun,
    gitStatus: vi.fn(),
    gitDiff: vi.fn(),
  })),
}));

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "codeclaw-git-test-"));
  await execa("git", ["init"], { cwd: tmpDir });
  await execa("git", ["config", "user.email", "test@test.com"], { cwd: tmpDir });
  await execa("git", ["config", "user.name", "Test"], { cwd: tmpDir });

  const testFile = join(tmpDir, "test.txt");
  await writeFile(testFile, "initial content", "utf-8");
  await execa("git", ["add", "."], { cwd: tmpDir });
  await execa("git", ["commit", "-m", "initial"], { cwd: tmpDir });
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

function makeResponse(stdout: string, exitCode = 0) {
  return {
    success: exitCode === 0,
    action: "run-command",
    exitCode,
    stdout,
    stderr: "",
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    durationMs: 10,
    timedOut: false,
    cancelled: false,
    redacted: false,
    error: null,
  };
}

describe("gitService", () => {
  beforeEach(() => {
    mockRun.mockReset();
    resetNativeRunner();
  });

  it("getGitStatus returns clean true for clean repo", async () => {
    mockRun.mockResolvedValueOnce(makeResponse("main\n")).mockResolvedValueOnce(makeResponse(""));

    const status = await getGitStatus(tmpDir);
    expect(status.clean).toBe(true);
    expect(status.branch).toBe("main");
  });

  it("getGitStatus returns clean false after changes", async () => {
    await writeFile(join(tmpDir, "test.txt"), "modified content", "utf-8");
    mockRun
      .mockResolvedValueOnce(makeResponse("main\n"))
      .mockResolvedValueOnce(makeResponse(" M test.txt\n"));

    const status = await getGitStatus(tmpDir);
    expect(status.clean).toBe(false);
  });

  it("getChangedFiles returns modified files", async () => {
    mockRun
      .mockResolvedValueOnce(makeResponse("test.txt\n"))
      .mockResolvedValueOnce(makeResponse(""))
      .mockResolvedValueOnce(makeResponse(""));

    const files = await getChangedFiles(tmpDir);
    expect(files).toContain("test.txt");
  });

  it("generateDiff produces output", async () => {
    mockRun.mockResolvedValueOnce(
      makeResponse(
        "diff --git a/test.txt b/test.txt\nindex abc..def 100644\n--- a/test.txt\n+++ b/test.txt\n@@ -1 +1 @@\n-initial\n+modified\n",
      ),
    );

    const diffPath = join(tmpDir, "test.diff");
    const content = await generateDiff(tmpDir, diffPath);
    expect(content.length).toBeGreaterThan(0);
  });

  it("getDiffStats returns stats", async () => {
    mockRun.mockResolvedValueOnce(makeResponse("1\t1\ttest.txt\n"));

    const stats = await getDiffStats(tmpDir);
    expect(typeof stats.added).toBe("number");
    expect(typeof stats.modified).toBe("number");
    expect(typeof stats.deleted).toBe("number");
  });
});
