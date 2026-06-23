import { mkdir, writeFile } from "node:fs/promises";
import type { TestRunResult } from "./testRunner.js";

export interface WriteResult {
  testResultPath: string;
  failedTestsPath: string;
}

export async function writeTestResultArtifacts(
  result: TestRunResult,
  testDir: string,
): Promise<WriteResult> {
  await mkdir(testDir, { recursive: true });

  const testResultPath = `${testDir}/test-result.md`;
  const failedTestsPath = `${testDir}/failed-tests.json`;

  const lines: string[] = [];
  lines.push("# Test Result\n");
  lines.push("## Summary\n");
  lines.push(`Status: ${result.overallStatus}\n`);
  lines.push("## Commands\n");

  for (const r of result.results) {
    lines.push(`### ${r.commandName}\n`);
    lines.push(`Command: ${r.command}\n`);
    lines.push(`Exit code: ${String(r.exitCode ?? -1)}\n`);
    lines.push(`Duration: ${(r.durationMs / 1000).toFixed(1)}s\n`);
    lines.push(`Passed: ${r.passed ? "Yes" : "No"}\n`);
    if (r.timedOut) {
      lines.push("Timed out: Yes\n");
    }
    lines.push("\n");
  }

  const failedCommands = result.results.filter((r) => !r.passed);

  if (failedCommands.length > 0) {
    lines.push("## Failed Tests\n");
    for (const r of failedCommands) {
      lines.push(`- ${r.commandName}\n`);
      if (r.failureSummary) {
        lines.push(`  - Message: ${r.failureSummary.slice(0, 500)}\n`);
      }
    }
  }

  await writeFile(testResultPath, lines.join(""), "utf-8");

  const failedTests = result.results
    .filter((r) => !r.passed)
    .map((r) => ({
      commandName: r.commandName,
      exitCode: r.exitCode,
      timedOut: r.timedOut,
      failureSummary: r.failureSummary,
    }));

  const jsonContent = {
    overallStatus: result.overallStatus,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    failedTests,
  };

  await writeFile(failedTestsPath, JSON.stringify(jsonContent, null, 2), "utf-8");

  return { testResultPath, failedTestsPath };
}
