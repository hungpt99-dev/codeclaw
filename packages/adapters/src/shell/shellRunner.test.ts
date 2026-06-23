import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, rm, access } from "node:fs/promises";
import { runShellCommand } from "./shellRunner.js";

describe("runShellCommand", () => {
  it("executes a command and returns exit code 0", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "aiteam-test-"));
    const outPath = join(tmpDir, "stdout.log");
    const errPath = join(tmpDir, "stderr.log");

    try {
      const result = await runShellCommand({
        command: "echo",
        args: ["hello"],
        cwd: tmpDir,
        timeoutSeconds: 10,
        stdoutPath: outPath,
        stderrPath: errPath,
      });

      expect(result.exitCode).toBe(0);
      expect(result.timedOut).toBe(false);
      expect(result.durationMs).toBeGreaterThan(0);

      await access(outPath);
      await access(errPath);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("captures non-zero exit code", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "aiteam-test-"));
    const outPath = join(tmpDir, "stdout.log");
    const errPath = join(tmpDir, "stderr.log");

    try {
      const result = await runShellCommand({
        command: "sh",
        args: ["-c", "exit 42"],
        cwd: tmpDir,
        timeoutSeconds: 10,
        stdoutPath: outPath,
        stderrPath: errPath,
      });

      expect(result.exitCode).toBe(42);
      expect(result.timedOut).toBe(false);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("enforces timeout", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "aiteam-test-"));
    const outPath = join(tmpDir, "stdout.log");
    const errPath = join(tmpDir, "stderr.log");

    try {
      const result = await runShellCommand({
        command: "sh",
        args: ["-c", "sleep 10"],
        cwd: tmpDir,
        timeoutSeconds: 1,
        stdoutPath: outPath,
        stderrPath: errPath,
      });

      expect(result.exitCode).toBeNull();
      expect(result.timedOut).toBe(true);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  }, 10000);
});
