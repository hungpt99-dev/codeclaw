import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

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

export async function runShellCommand(input: ShellRunInput): Promise<ShellRunResult> {
  const start = Date.now();

  await mkdir(dirname(input.stdoutPath), { recursive: true });
  await mkdir(dirname(input.stderrPath), { recursive: true });

  const stdoutStream = createWriteStream(input.stdoutPath, { encoding: "utf-8" });
  const stderrStream = createWriteStream(input.stderrPath, { encoding: "utf-8" });

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, input.timeoutSeconds * 1000);

  return new Promise((resolve) => {
    const child = spawn(input.command, input.args, {
      cwd: input.cwd,
      env: input.env ? { ...process.env, ...input.env } : undefined,
      signal: abortController.signal,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.pipe(stdoutStream, { end: true });
    child.stderr.pipe(stderrStream, { end: true });

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      stdoutStream.end();
      stderrStream.end();
      const durationMs = Date.now() - start;

      resolve({
        exitCode: code,
        stdoutPath: input.stdoutPath,
        stderrPath: input.stderrPath,
        durationMs,
        timedOut: false,
      });
    });

    child.on("error", () => {
      clearTimeout(timeoutId);
      stdoutStream.end();
      stderrStream.end();
      const durationMs = Date.now() - start;

      resolve({
        exitCode: null,
        stdoutPath: input.stdoutPath,
        stderrPath: input.stderrPath,
        durationMs,
        timedOut: abortController.signal.aborted,
      });
    });

    abortController.signal.addEventListener("abort", () => {
      child.kill("SIGTERM");
      clearTimeout(timeoutId);
      stdoutStream.end();
      stderrStream.end();
      const durationMs = Date.now() - start;

      resolve({
        exitCode: null,
        stdoutPath: input.stdoutPath,
        stderrPath: input.stderrPath,
        durationMs,
        timedOut: true,
      });
    });
  });
}
