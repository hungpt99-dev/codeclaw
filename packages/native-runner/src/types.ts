export interface NativeRunnerRequestBase {
  action: "run-command" | "git-status" | "git-diff";
  cwd: string;
  timeoutMs: number | undefined;
  redactSecrets: boolean | undefined;
}

export interface RunCommandRequest extends NativeRunnerRequestBase {
  action: "run-command";
  command: string;
  args: string[] | undefined;
  env: Record<string, string> | undefined;
  policy: CommandPolicy | undefined;
  captureStdout: boolean | undefined;
  captureStderr: boolean | undefined;
}

export interface GitStatusRequest extends NativeRunnerRequestBase {
  action: "git-status";
}

export interface GitDiffRequest extends NativeRunnerRequestBase {
  action: "git-diff";
  staged: boolean | undefined;
}

export type NativeRunnerRequest = RunCommandRequest | GitStatusRequest | GitDiffRequest;

export interface CommandPolicy {
  allowCommands: string[] | undefined;
  denyPatterns: string[] | undefined;
}

export interface NativeRunnerError {
  code: string;
  message: string;
}

export interface NativeRunnerResponse {
  success: boolean;
  action: "run-command" | "git-status" | "git-diff";
  exitCode: number | null;
  stdout: string | null;
  stderr: string | null;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  timedOut: boolean | null;
  cancelled: boolean | null;
  redacted: boolean;
  error: NativeRunnerError | null;
}
