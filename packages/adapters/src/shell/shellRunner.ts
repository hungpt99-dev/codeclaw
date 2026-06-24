import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { NativeRunnerClient } from "@codeclaw/native-runner";

export interface ShellRunInput {
  command: string;
  args: string[];
  cwd: string;
  timeoutSeconds: number;
  stdoutPath: string;
  stderrPath: string;
  env?: Record<string, string>;
}

export interface ShellRunResult {
  exitCode: number | null;
  stdoutPath: string;
  stderrPath: string;
  durationMs: number;
  timedOut: boolean;
}

let nativeRunner: NativeRunnerClient | null = null;

export function resetNativeRunner(): void {
  nativeRunner = null;
}

function getRunner(): NativeRunnerClient {
  nativeRunner ??= new NativeRunnerClient();
  return nativeRunner;
}

export async function runShellCommand(input: ShellRunInput): Promise<ShellRunResult> {
  const start = Date.now();

  await mkdir(dirname(input.stdoutPath), { recursive: true });
  await mkdir(dirname(input.stderrPath), { recursive: true });

  const runner = getRunner();

  const response = await runner.runCommand({
    command: input.command,
    args: input.args,
    cwd: input.cwd,
    timeoutMs: input.timeoutSeconds * 1000,
    env: input.env,
    policy: undefined,
    captureStdout: true,
    captureStderr: true,
    redactSecrets: true,
  });

  const durationMs = Date.now() - start;
  const exitCode = response.exitCode;

  await writeFile(input.stdoutPath, response.stdout ?? "", "utf-8");
  await writeFile(input.stderrPath, response.stderr ?? "", "utf-8");

  if (!response.success && response.error?.code === "RUNNER_NOT_FOUND") {
    throw new Error(
      `CodeClaw native runner is required for command execution. ` +
        `Please install or build \`codeclaw-runner\` before running commands. ` +
        `See crates/codeclaw-runner/README.md for build instructions.`,
    );
  }

  return {
    exitCode,
    stdoutPath: input.stdoutPath,
    stderrPath: input.stderrPath,
    durationMs,
    timedOut: response.timedOut ?? false,
  };
}
