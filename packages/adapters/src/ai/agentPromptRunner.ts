import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";

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
    `aiteam-prompt-${String(Date.now())}-${Math.random().toString(36).slice(2)}.txt`,
  );

  try {
    await writeFile(tmpFile, prompt, "utf-8");

    const { cmd, args } = getCliArgs(config.command);
    const allArgs = [...(config.args ?? args)];

    if (config.command === "aider") {
      allArgs[1] = prompt;
    }

    const subprocess = execa(cmd, [...allArgs, tmpFile], {
      timeout: config.timeoutSeconds * 1000,
      reject: false,
    });

    const { stdout, stderr, exitCode } = await subprocess;

    if (exitCode !== 0) {
      return {
        success: false,
        output: stdout || "",
        error: stderr || `Command exited with code ${String(exitCode)}`,
      };
    }

    return {
      success: true,
      output: stdout || "",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("ENOENT") ||
      message.includes("command not found") ||
      message.includes("not found")
    ) {
      return {
        success: false,
        output: "",
        error: `CLI not found: ${config.command}. Ensure it is installed and in PATH.`,
      };
    }
    if (
      message.includes("timed out") ||
      message.includes("ETIMEDOUT") ||
      message.includes("timeout")
    ) {
      return {
        success: false,
        output: "",
        error: `Command timed out after ${String(config.timeoutSeconds)} seconds: ${config.command}`,
      };
    }
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
