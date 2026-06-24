import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AiTaskInput, AiTaskResult } from "@codeclaw/shared";
import { runShellCommand } from "../../shell/shellRunner.js";
import { getChangedFiles, saveGitSnapshot, generateDiff } from "../../git/gitService.js";
import type { AiCliAdapter } from "../aiCliAdapter.js";
import { NativeRunnerClient } from "@codeclaw/native-runner";

export interface OpenCodeAdapterConfig {
  command?: string;
  timeoutSeconds?: number;
}

export function createOpenCodeAdapter(config?: OpenCodeAdapterConfig): AiCliAdapter {
  const command = config?.command ?? "opencode";
  const timeoutSeconds = config?.timeoutSeconds ?? 900;

  async function isAvailable(): Promise<boolean> {
    try {
      const runner = new NativeRunnerClient();
      const response = await runner.runCommand({
        command: "which",
        args: [command],
        cwd: process.cwd(),
        timeoutMs: 5000,
        env: undefined,
        policy: undefined,
        captureStdout: true,
        captureStderr: true,
        redactSecrets: true,
      });
      return response.success && response.exitCode === 0;
    } catch {
      return false;
    }
  }

  async function runTask(input: AiTaskInput): Promise<AiTaskResult> {
    const workingDir = input.workingDir;
    const snapshotDir = join(workingDir, ".codeclaw", ".snapshots");
    const diffDir = join(workingDir, ".codeclaw", ".diffs");

    await saveGitSnapshot(workingDir, snapshotDir);

    const tmpDir = await mkdtemp(join(tmpdir(), "codeclaw-opencode-"));
    const promptFile = join(tmpDir, "prompt.md");
    const outputLogPath = input.outputLogPath;

    try {
      await writeFile(promptFile, input.prompt, "utf-8");

      const args = buildOpenCodeArgs(promptFile);

      const result = await runShellCommand({
        command,
        args,
        cwd: workingDir,
        timeoutSeconds: input.timeoutSeconds || timeoutSeconds,
        stdoutPath: outputLogPath,
        stderrPath: `${outputLogPath}.err`,
      });

      const changedFiles = await getChangedFiles(workingDir);

      const diffOutputPath = join(diffDir, `diff-${String(Date.now())}.patch`);
      await generateDiff(workingDir, diffOutputPath);

      return {
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        outputLogPath,
        changedFiles,
      };
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  }

  return {
    name: "opencode",
    isAvailable,
    runTask,
  };
}

function buildOpenCodeArgs(promptFile: string): string[] {
  return ["--prompt", promptFile];
}
