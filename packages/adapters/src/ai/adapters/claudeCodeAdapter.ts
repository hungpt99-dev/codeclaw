import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AiTaskInput, AiTaskResult } from "@codeclaw/shared";
import { runShellCommand } from "../../shell/shellRunner.js";
import { getChangedFiles, saveGitSnapshot, generateDiff } from "../../git/gitService.js";
import type { AiCliAdapter } from "../aiCliAdapter.js";

async function checkClaudeAvailable(): Promise<boolean> {
  try {
    const result = await runShellCommand({
      command: "which",
      args: ["claude"],
      cwd: process.cwd(),
      timeoutSeconds: 5,
      stdoutPath: join(tmpdir(), `codeclaw-claude-check-${String(Date.now())}.out`),
      stderrPath: join(tmpdir(), `codeclaw-claude-check-${String(Date.now())}.err`),
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

export function createClaudeCodeAdapter(): AiCliAdapter {
  return {
    name: "claude",

    async isAvailable(): Promise<boolean> {
      return checkClaudeAvailable();
    },

    async runTask(input: AiTaskInput): Promise<AiTaskResult> {
      const snapshotDir = join(input.workingDir, ".codeclaw", ".snapshots");
      const diffDir = join(input.workingDir, ".codeclaw", ".diffs");

      await saveGitSnapshot(input.workingDir, snapshotDir);

      const tmpDir = await mkdtemp(join(tmpdir(), "codeclaw-claude-"));
      const promptFile = join(tmpDir, "prompt.md");
      await writeFile(promptFile, input.prompt, "utf-8");

      try {
        const result = await runShellCommand({
          command: "claude",
          args: ["-p", promptFile, "--working-dir", input.workingDir, "--print"],
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
