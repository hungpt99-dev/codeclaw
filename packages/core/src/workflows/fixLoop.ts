import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TestCommand, TestRunResult } from "@aiteam/adapters";
import { runAgentPrompt } from "@aiteam/adapters";
import { getArtifactPaths, writeArtifact } from "../artifacts/artifactWriter.js";
import { loadAndReview, persistReview } from "../review/reviewService.js";
import type { ReviewOutput } from "../review/reviewService.js";
import { generateFixPrompt } from "./fixPromptGenerator.js";
import type { ParsedTestFailure } from "./fixPromptGenerator.js";

export interface FixLoopConfig {
  maxIterations: number;
  testCommands: TestCommand[];
  aiTool: { tool: string; command: string; timeoutSeconds: number };
}

export interface FixLoopIteration {
  iteration: number;
  fixPrompt: string;
  testResult: TestRunResult;
  reviewResult: ReviewOutput;
  gitDiff: string;
  passed: boolean;
}

export interface FixLoopResult {
  iterations: FixLoopIteration[];
  finalStatus: "PASSED" | "FAILED" | "MAX_ITERATIONS_REACHED";
  totalDurationMs: number;
}

function analyzeTestFailures(testResult?: TestRunResult): ParsedTestFailure[] {
  if (!testResult) return [];
  const failures: ParsedTestFailure[] = [];
  for (const r of testResult.results) {
    if (!r.passed && r.failureSummary) {
      failures.push({
        testName: r.commandName,
        suiteName: undefined,
        message: r.failureSummary,
        file: undefined,
        line: undefined,
      });
    }
  }
  return failures;
}

function makeIterationPaths(runId: string, iteration: number) {
  const base = join(".ai-team", "runs", runId, "implementation", "fix-loop");
  const iter = String(iteration);
  return {
    fixPromptPath: join(base, `fix-prompt-${iter}.md`),
    fixDiffPath: join(base, `diff-${iter}.patch`),
    testStdoutPath: join(base, `test-${iter}-stdout.log`),
    testStderrPath: join(base, `test-${iter}-stderr.log`),
    summaryPath: join(base, "iteration-summary.md"),
  };
}

export async function runFixLoop(
  runId: string,
  originalPrompt: string,
  config: FixLoopConfig,
): Promise<FixLoopResult> {
  const startTime = Date.now();
  const iterations: FixLoopIteration[] = [];
  const { mkdir } = await import("node:fs/promises");
  const { getChangedFiles, generateDiff } = await import("@aiteam/adapters");
  const { runTests } = await import("@aiteam/adapters");

  const workingDir = process.cwd();
  const fixLoopBase = join(".ai-team", "runs", runId, "implementation", "fix-loop");
  await mkdir(fixLoopBase, { recursive: true });

  for (let i = 1; i <= config.maxIterations; i++) {
    const iterPaths = makeIterationPaths(runId, i);

    const previousTestResult = iterations[i - 2]?.testResult;
    const previousReviewResult = iterations[i - 2]?.reviewResult;

    const testFailures = analyzeTestFailures(previousTestResult);
    const reviewFindings = previousReviewResult?.reviewReport ?? "";

    const previousDiff =
      i > 1 && iterations[i - 2]?.gitDiff ? (iterations[i - 2]?.gitDiff ?? "") : "";

    const fixPrompt = generateFixPrompt(
      i,
      runId,
      previousDiff,
      testFailures,
      reviewFindings,
      originalPrompt,
    );

    await writeArtifact(iterPaths.fixPromptPath, fixPrompt);

    await runAgentPrompt(fixPrompt, {
      command: config.aiTool.command,
      timeoutSeconds: config.aiTool.timeoutSeconds,
    });

    const changedFiles = await getChangedFiles(workingDir);
    const fullDiff = await generateDiff(workingDir, iterPaths.fixDiffPath);

    const paths = getArtifactPaths(runId);
    await writeFile(paths.diffPatchPath, fullDiff, "utf-8");
    await writeFile(
      paths.changedFilesPath,
      JSON.stringify({ files: changedFiles, generatedAt: new Date().toISOString() }, null, 2),
      "utf-8",
    );

    const testLogDir = join(fixLoopBase, `test-logs-${String(i)}`);
    await mkdir(testLogDir, { recursive: true });

    const testResult = await runTests(config.testCommands, testLogDir);

    const reviewResult = await loadAndReview(runId, {
      aiTool: config.aiTool,
    });
    await persistReview(runId, reviewResult);

    const passed =
      testResult.overallStatus === "PASSED" && reviewResult.overallStatus !== "CHANGES_REQUIRED";

    const iteration: FixLoopIteration = {
      iteration: i,
      fixPrompt,
      testResult,
      reviewResult,
      gitDiff: fullDiff,
      passed,
    };

    iterations.push(iteration);

    const summaryLine = `## Iteration ${String(i)}\n- Passed: ${passed ? "Yes" : "No"}\n- Test Status: ${testResult.overallStatus}\n- Review Status: ${reviewResult.overallStatus}\n- Files Changed: ${String(changedFiles.length)}\n`;
    await writeArtifact(iterPaths.summaryPath, summaryLine);

    if (passed) {
      return {
        iterations,
        finalStatus: "PASSED",
        totalDurationMs: Date.now() - startTime,
      };
    }
  }

  return {
    iterations,
    finalStatus: "MAX_ITERATIONS_REACHED",
    totalDurationMs: Date.now() - startTime,
  };
}
