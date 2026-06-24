import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AiTaskInput, AiTaskResult } from "@codeclaw/shared";
import { runShellCommand } from "../../shell/shellRunner.js";
import { getChangedFiles, saveGitSnapshot, generateDiff } from "../../git/gitService.js";
import type { AiCliAdapter } from "../aiCliAdapter.js";
import { execa } from "execa";

async function getOpenCodeHelp(): Promise<string | undefined> {
  try {
    const result = await execa("opencode", ["--help"], {
      timeout: 10000,
      reject: false,
    });
    if (result.exitCode === 0) {
      return (result.stdout || result.stderr || "").trim() || undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function checkOpenCodeOnPath(): Promise<boolean> {
  try {
    const result = await runShellCommand({
      command: "which",
      args: ["opencode"],
      cwd: process.cwd(),
      timeoutSeconds: 5,
      stdoutPath: join(tmpdir(), `codeclaw-opencode-check-${String(Date.now())}.out`),
      stderrPath: join(tmpdir(), `codeclaw-opencode-check-${String(Date.now())}.err`),
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

export interface OpenCodeAdapterConfig {
  command?: string;
  timeoutSeconds?: number;
}

export function createOpenCodeAdapter(config?: OpenCodeAdapterConfig): AiCliAdapter {
  const command = config?.command ?? "opencode";
  const timeoutSeconds = config?.timeoutSeconds ?? 900;

  async function isAvailable(): Promise<boolean> {
    return checkOpenCodeOnPath();
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

      const helpText = await getOpenCodeHelp();
      const args = buildOpenCodeArgs(helpText, promptFile);

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

function buildOpenCodeArgs(helpText: string | undefined, promptFile: string): string[] {
  if (helpText) {
    if (
      helpText.includes("--prompt") ||
      helpText.includes("-p ") ||
      helpText.includes("--prompt-file")
    ) {
      if (helpText.includes("--prompt-file")) {
        return ["--prompt-file", promptFile];
      }
      return ["--prompt", promptFile];
    }
    if (helpText.includes("[prompt]")) {
      return [promptFile];
    }
  }
  return ["--prompt", promptFile];
}
