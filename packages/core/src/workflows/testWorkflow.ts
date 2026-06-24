import { join } from "node:path";
import type { TestCommandResult } from "@codeclaw/shared";
import { getArtifactPaths } from "../artifacts/artifactWriter.js";

export interface TestWorkflowInput {
  runId: string;
  commands: {
    build: string;
    unitTest: string;
    integrationTest: string;
    lint: string;
  };
  cwd: string;
  timeoutSeconds: number;
  filter?: ("build" | "unitTest" | "integrationTest" | "lint")[];
}

export interface TestWorkflowOutput {
  overallStatus: string;
  results: TestCommandResult[];
  testResultPath: string;
  failedTestsPath: string;
}

export async function runTestsForRun(input: TestWorkflowInput): Promise<TestWorkflowOutput> {
  const paths = getArtifactPaths(input.runId);
  const { runTests, writeTestResultArtifacts } = await import("@codeclaw/adapters");

  const allCommands = [
    { name: "build", command: input.commands.build },
    { name: "unitTest", command: input.commands.unitTest },
    { name: "integrationTest", command: input.commands.integrationTest },
    { name: "lint", command: input.commands.lint },
  ];

  const filtered = input.filter
    ? allCommands.filter((c) => input.filter?.includes(c.name as (typeof input.filter)[number]))
    : allCommands;

  const testDir = join(paths.runDir, "tests");

  const testRun = await runTests(
    filtered.map((c) => ({
      name: c.name,
      command: c.command,
      cwd: input.cwd,
      timeoutSeconds: input.timeoutSeconds,
    })),
    testDir,
  );

  const { testResultPath, failedTestsPath } = await writeTestResultArtifacts(testRun, testDir);

  return {
    overallStatus: testRun.overallStatus,
    results: testRun.results.map((r) => ({
      name: r.commandName,
      command: r.command,
      exitCode: r.exitCode,
      status: r.timedOut ? "TIMEOUT" : r.passed ? "PASSED" : "FAILED",
      durationMs: r.durationMs,
      stdoutPath: r.stdoutPath,
      stderrPath: r.stderrPath,
    })),
    testResultPath,
    failedTestsPath,
  };
}
