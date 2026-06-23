import { runShellCommand } from "../shell/shellRunner.js";
import { parseGenericOutput } from "./testOutputParser.js";

export interface TestCommand {
  name: string;
  command: string;
  cwd: string;
  timeoutSeconds: number;
}

export interface TestResult {
  commandName: string;
  command: string;
  exitCode: number | null;
  passed: boolean;
  durationMs: number;
  timedOut: boolean;
  stdoutPath: string;
  stderrPath: string;
  failureSummary: string | undefined;
}

export interface TestRunResult {
  overallStatus: "PASSED" | "FAILED" | "TIMEOUT" | "SKIPPED";
  results: TestResult[];
  startedAt: string;
  completedAt: string;
}

export async function runTests(commands: TestCommand[], logDir: string): Promise<TestRunResult> {
  const startedAt = new Date().toISOString();
  const results: TestResult[] = [];

  const enabled = commands.filter((c) => c.command.trim().length > 0);

  if (enabled.length === 0) {
    return {
      overallStatus: "SKIPPED",
      results: [],
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  for (const cmd of enabled) {
    const stdoutPath = `${logDir}/${cmd.name}-stdout.log`;
    const stderrPath = `${logDir}/${cmd.name}-stderr.log`;

    const shellResult = await runShellCommand({
      command: cmd.command,
      args: [],
      cwd: cmd.cwd,
      timeoutSeconds: cmd.timeoutSeconds,
      stdoutPath,
      stderrPath,
    });

    let failureSummary: string | undefined;
    if (shellResult.exitCode !== 0 && !shellResult.timedOut) {
      const { readFile } = await import("node:fs/promises");
      const stderr = await readFile(stderrPath, "utf-8").catch(() => "");
      const stdout = await readFile(stdoutPath, "utf-8").catch(() => "");
      const combined = `${stdout}\n${stderr}`;
      const failures = parseGenericOutput(combined);
      if (failures.length > 0) {
        failureSummary = failures
          .slice(0, 10)
          .map((f) => f.message)
          .join("\n");
      }
    }

    results.push({
      commandName: cmd.name,
      command: cmd.command,
      exitCode: shellResult.exitCode,
      passed: shellResult.exitCode === 0 && !shellResult.timedOut,
      durationMs: shellResult.durationMs,
      timedOut: shellResult.timedOut,
      stdoutPath,
      stderrPath,
      failureSummary,
    });
  }

  const hasTimeout = results.some((r) => r.timedOut);
  const allPassed = results.every((r) => r.passed);

  let overallStatus: TestRunResult["overallStatus"] = "PASSED";
  if (hasTimeout) {
    overallStatus = "TIMEOUT";
  } else if (!allPassed) {
    overallStatus = "FAILED";
  }

  return {
    overallStatus,
    results,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}
