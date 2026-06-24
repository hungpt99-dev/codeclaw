import { execFile } from "node:child_process";
import type {
  NativeRunnerRequest,
  NativeRunnerResponse,
  RunCommandRequest,
  GitStatusRequest,
  GitDiffRequest,
} from "./types.js";
import type { CommandPolicy } from "./types.js";

export interface RunCommandOptions {
  command: string;
  args: string[] | undefined;
  cwd: string;
  timeoutMs: number | undefined;
  env: Record<string, string> | undefined;
  policy: CommandPolicy | undefined;
  captureStdout: boolean | undefined;
  captureStderr: boolean | undefined;
  redactSecrets: boolean | undefined;
}

export interface GitStatusOptions {
  cwd: string;
  timeoutMs: number | undefined;
  redactSecrets: boolean | undefined;
}

export interface GitDiffOptions {
  cwd: string;
  timeoutMs: number | undefined;
  redactSecrets: boolean | undefined;
  staged: boolean | undefined;
}

export class NativeRunnerClient {
  private runnerPath: string;
  private runnerChecked = false;
  private runnerAvailable = false;

  constructor(runnerPath?: string) {
    this.runnerPath = runnerPath ?? "codeclaw-runner";
  }

  async checkAvailability(): Promise<{ available: boolean; path: string; reason?: string }> {
    if (this.runnerChecked) {
      return { available: this.runnerAvailable, path: this.runnerPath };
    }

    try {
      await new Promise<void>((resolve, reject) => {
        execFile("which", [this.runnerPath], { timeout: 5000 }, (err: Error | null) => {
          if (err) reject(new Error(err.message));
          else resolve();
        });
      });
      this.runnerAvailable = true;
    } catch {
      this.runnerAvailable = false;
    }
    this.runnerChecked = true;

    if (!this.runnerAvailable) {
      return {
        available: false,
        path: this.runnerPath,
        reason: `Native runner '${this.runnerPath}' not found. Build or install it before running commands.`,
      };
    }

    return { available: true, path: this.runnerPath };
  }

  async runCommand(options: RunCommandOptions): Promise<NativeRunnerResponse> {
    const availability = await this.checkAvailability();
    if (!availability.available) {
      return this.notFoundResponse("run-command", availability.reason);
    }

    const request: RunCommandRequest = {
      action: "run-command",
      command: options.command,
      args: options.args,
      cwd: options.cwd,
      timeoutMs: options.timeoutMs ?? undefined,
      env: options.env ?? undefined,
      policy: options.policy ?? undefined,
      captureStdout: options.captureStdout ?? undefined,
      captureStderr: options.captureStderr ?? undefined,
      redactSecrets: options.redactSecrets ?? undefined,
    };

    return this.sendRequest(request);
  }

  async gitStatus(options: GitStatusOptions): Promise<NativeRunnerResponse> {
    const availability = await this.checkAvailability();
    if (!availability.available) {
      return this.notFoundResponse("git-status", availability.reason);
    }

    const request: GitStatusRequest = {
      action: "git-status",
      cwd: options.cwd,
      timeoutMs: options.timeoutMs ?? undefined,
      redactSecrets: options.redactSecrets ?? undefined,
    };

    return this.sendRequest(request);
  }

  async gitDiff(options: GitDiffOptions): Promise<NativeRunnerResponse> {
    const availability = await this.checkAvailability();
    if (!availability.available) {
      return this.notFoundResponse("git-diff", availability.reason);
    }

    const request: GitDiffRequest = {
      action: "git-diff",
      cwd: options.cwd,
      timeoutMs: options.timeoutMs ?? undefined,
      redactSecrets: options.redactSecrets ?? undefined,
      staged: options.staged ?? undefined,
    };

    return this.sendRequest(request);
  }

  private notFoundResponse(
    action: "run-command" | "git-status" | "git-diff",
    reason?: string,
  ): NativeRunnerResponse {
    return {
      success: false,
      action,
      exitCode: null,
      stdout: null,
      stderr: null,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 0,
      timedOut: null,
      cancelled: null,
      redacted: false,
      error: { code: "RUNNER_NOT_FOUND", message: reason ?? "Native runner not found" },
    };
  }

  private sendRequest(request: NativeRunnerRequest): Promise<NativeRunnerResponse> {
    return new Promise((resolve) => {
      const input = JSON.stringify(request);
      const child = execFile(
        this.runnerPath,
        [],
        {
          timeout: (request.timeoutMs ?? 60000) + 5000,
          maxBuffer: 100 * 1024 * 1024,
        },
        (_err: Error | null, stdout: string, stderr: string) => {
          if (stdout) {
            try {
              const parsed = JSON.parse(stdout) as NativeRunnerResponse;
              resolve(parsed);
              return;
            } catch {
              resolve({
                success: false,
                action: request.action,
                exitCode: null,
                stdout: stdout || null,
                stderr: stderr || null,
                startedAt: new Date().toISOString(),
                endedAt: new Date().toISOString(),
                durationMs: 0,
                timedOut: null,
                cancelled: null,
                redacted: false,
                error: { code: "PARSE_ERROR", message: "Failed to parse native runner response" },
              });
              return;
            }
          }

          resolve({
            success: false,
            action: request.action,
            exitCode: null,
            stdout: stdout || null,
            stderr: stderr || null,
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
            durationMs: 0,
            timedOut: null,
            cancelled: null,
            redacted: false,
            error: {
              code: "RUNNER_ERROR",
              message: stderr || "Native runner exited with non-zero code",
            },
          });
        },
      );

      child.stdin?.end(input);
    });
  }
}
