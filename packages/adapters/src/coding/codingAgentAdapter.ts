export interface CodingAgentAvailability {
  available: boolean;
  version?: string;
  reason?: string;
}

export interface CodingAgentRunInput {
  runId: string;
  projectRoot: string;
  prompt: string;
  dryRun: boolean;
  timeoutMs: number | undefined;
  env: Record<string, string> | undefined;
}

export interface CodingAgentRunResult {
  adapterId: string;
  name: string;
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  artifacts: string[];
}

export interface CodingAgentAdapter {
  id: string;
  name: string;
  checkAvailability(): Promise<CodingAgentAvailability>;
  run(input: CodingAgentRunInput): Promise<CodingAgentRunResult>;
}
