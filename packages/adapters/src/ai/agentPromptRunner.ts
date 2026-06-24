import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NativeRunnerClient } from "@codeclaw/native-runner";

export interface AgentPromptRunnerConfig {
  command: string;
  args?: string[];
  timeoutSeconds: number;
}

function getCliArgs(command: string): { cmd: string; args: string[] } {
  switch (command) {
    case "claude":
      return { cmd: "claude", args: ["--print"] };
    case "codex":
      return { cmd: "codex", args: [] };
    case "gemini":
      return { cmd: "gemini", args: ["--print"] };
    case "aider":
      return { cmd: "aider", args: ["--message", "", "--no-auto-commits", "--yes"] };
    default:
      return { cmd: command, args: [] };
  }
}

export async function runAgentPrompt(
  prompt: string,
  config: AgentPromptRunnerConfig,
): Promise<{ success: boolean; output: string; error?: string }> {
  const tmpFile = join(
    tmpdir(),
    `codeclaw-prompt-${String(Date.now())}-${Math.random().toString(36).slice(2)}.txt`,
  );

  try {
    await writeFile(tmpFile, prompt, "utf-8");

    const { cmd, args } = getCliArgs(config.command);
    const allArgs = [...(config.args ?? args)];

    if (config.command === "aider") {
      allArgs[1] = prompt;
    }

    const runner = new NativeRunnerClient();
    const response = await runner.runCommand({
      command: cmd,
      args: [...allArgs, tmpFile],
      cwd: process.cwd(),
      timeoutMs: config.timeoutSeconds * 1000,
      env: undefined,
      policy: undefined,
      captureStdout: true,
      captureStderr: true,
      redactSecrets: true,
    });

    if (!response.success && response.error?.code === "RUNNER_NOT_FOUND") {
      return {
        success: false,
        output: "",
        error: `CodeClaw native runner is required for command execution. Please install or build codeclaw-runner.`,
      };
    }

    if (response.exitCode !== 0 && response.exitCode !== null) {
      return {
        success: false,
        output: response.stdout ?? "",
        error: response.stderr ?? `Command exited with code ${String(response.exitCode)}`,
      };
    }

    if (response.timedOut) {
      return {
        success: false,
        output: "",
        error: `Command timed out after ${String(config.timeoutSeconds)} seconds: ${config.command}`,
      };
    }

    return {
      success: true,
      output: response.stdout ?? "",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      output: "",
      error: message,
    };
  } finally {
    try {
      await unlink(tmpFile);
    } catch {
      // ignore cleanup errors
    }
  }
}
