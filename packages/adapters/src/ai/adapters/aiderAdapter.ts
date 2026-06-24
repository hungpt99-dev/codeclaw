import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AiTaskInput, AiTaskResult } from "@aiteam/shared";
import { runShellCommand } from "../../shell/shellRunner.js";
import { getChangedFiles, saveGitSnapshot, generateDiff } from "../../git/gitService.js";
import type { AiCliAdapter } from "../aiCliAdapter.js";

async function checkAiderAvailable(): Promise<boolean> {
  try {
    const result = await runShellCommand({
      command: "which",
      args: ["aider"],
      cwd: process.cwd(),
      timeoutSeconds: 5,
      stdoutPath: join(tmpdir(), `aiteam-aider-check-${String(Date.now())}.out`),
      stderrPath: join(tmpdir(), `aiteam-aider-check-${String(Date.now())}.err`),
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

export function createAiderAdapter(): AiCliAdapter {
  return {
    name: "aider",

    async isAvailable(): Promise<boolean> {
      return checkAiderAvailable();
    },

    async runTask(input: AiTaskInput): Promise<AiTaskResult> {
      const snapshotDir = join(input.workingDir, ".ai-team", ".snapshots");
      const diffDir = join(input.workingDir, ".ai-team", ".diffs");

      await saveGitSnapshot(input.workingDir, snapshotDir);

      const tmpDir = await mkdtemp(join(tmpdir(), "aiteam-aider-"));
      const promptFile = join(tmpDir, "prompt.md");
      await writeFile(promptFile, input.prompt, "utf-8");

      try {
        const result = await runShellCommand({
          command: "aider",
          args: [
            "--message",
            input.prompt,
            "--no-auto-commits",
            "--yes",
            "--no-suggest-shell-commands",
          ],
          cwd: input.workingDir,
          timeoutSeconds: input.timeoutSeconds,
          stdoutPath: input.outputLogPath,
          stderrPath: `${input.outputLogPath}.err`,
        });

        const changedFiles = await getChangedFiles(input.workingDir);

        const diffOutputPath = join(diffDir, `diff-${String(Date.now())}.patch`);
        await generateDiff(input.workingDir, diffOutputPath);

        return {
          success: result.exitCode === 0,
          exitCode: result.exitCode,
          outputLogPath: input.outputLogPath,
          changedFiles,
        };
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    },
  };
}
