import { execa } from "execa";
import { createOpenCodeAdapter } from "../ai/adapters/opencodeAdapter.js";
import type {
  CodingAgentAdapter,
  CodingAgentAvailability,
  CodingAgentRunInput,
  CodingAgentRunResult,
} from "./codingAgentAdapter.js";

export function createOpenCodeCodingAgent(config: {
  command: string | undefined;
  timeoutMs: number | undefined;
}): CodingAgentAdapter {
  const command = config.command ?? "opencode";
  const timeoutMs = config.timeoutMs ?? 600000;

  async function checkAvailability(): Promise<CodingAgentAvailability> {
    try {
      const result = await execa("which", [command], {
        timeout: 5000,
        reject: false,
      });

      if (result.exitCode !== 0) {
        return {
          available: false,
          reason: `${command} not found in PATH. Install OpenCode CLI first.`,
        };
      }

      const versionResult = await execa(command, ["--version"], {
        timeout: 5000,
        reject: false,
      });

      return {
        available: true,
        version:
          versionResult.exitCode === 0 ? versionResult.stdout.trim() || "unknown" : "unknown",
      };
    } catch {
      return {
        available: false,
        reason: `${command} not found in PATH. Install OpenCode CLI first.`,
      };
    }
  }

  async function run(input: CodingAgentRunInput): Promise<CodingAgentRunResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    const aiAdapter = createOpenCodeAdapter({
      command,
      timeoutSeconds: Math.ceil((input.timeoutMs ?? timeoutMs) / 1000),
    });

    if (input.dryRun) {
      const endedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;
      return {
        adapterId: "opencode",
        name: "OpenCode CLI",
        success: true,
        exitCode: 0,
        stdout: "[DRY RUN] No command was executed.\n",
        stderr: "",
        startedAt,
        endedAt,
        durationMs,
        artifacts: [],
      };
    }

    try {
      const aiResult = await aiAdapter.runTask({
        role: "DEVELOPER",
        prompt: input.prompt,
        workingDir: input.projectRoot,
        outputLogPath: `${input.projectRoot}/.codeclaw/runs/${input.runId}/opencode-output.log`,
        timeoutSeconds: Math.ceil((input.timeoutMs ?? timeoutMs) / 1000),
      });

      const endedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      const artifacts: string[] = [];
      if (aiResult.outputLogPath) {
        artifacts.push(aiResult.outputLogPath);
      }
      artifacts.push(...aiResult.changedFiles.map((f) => f));

      return {
        adapterId: "opencode",
        name: "OpenCode CLI",
        success: aiResult.success,
        exitCode: aiResult.exitCode,
        stdout: "",
        stderr: aiResult.error ?? "",
        startedAt,
        endedAt,
        durationMs,
        artifacts,
      };
    } catch (err) {
      const endedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      return {
        adapterId: "opencode",
        name: "OpenCode CLI",
        success: false,
        exitCode: null,
        stdout: "",
        stderr: message,
        startedAt,
        endedAt,
        durationMs,
        artifacts: [],
      };
    }
  }

  return {
    id: "opencode",
    name: "OpenCode CLI",
    checkAvailability,
    run,
  };
}
