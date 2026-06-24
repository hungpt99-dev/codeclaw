import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execa } from "execa";
import { getGitStatus, getChangedFiles, generateDiff, getDiffStats } from "./gitService.js";

let tmpDir: string;

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

describe("gitService", () => {
  it("getGitStatus returns clean true for clean repo", async () => {
    const status = await getGitStatus(tmpDir);
    expect(status.clean).toBe(true);
    expect(status.branch).toBeTruthy();
  });

  it("getGitStatus returns clean false after changes", async () => {
    await writeFile(join(tmpDir, "test.txt"), "modified content", "utf-8");
    const status = await getGitStatus(tmpDir);
    expect(status.clean).toBe(false);
  });

  it("getChangedFiles returns modified files", async () => {
    const files = await getChangedFiles(tmpDir);
    expect(files).toContain("test.txt");
  });

  it("generateDiff produces output", async () => {
    const diffPath = join(tmpDir, "test.diff");
    const content = await generateDiff(tmpDir, diffPath);
    expect(content.length).toBeGreaterThan(0);
  });

  it("getDiffStats returns stats", async () => {
    const stats = await getDiffStats(tmpDir);
    expect(typeof stats.added).toBe("number");
    expect(typeof stats.modified).toBe("number");
    expect(typeof stats.deleted).toBe("number");
  });
});
