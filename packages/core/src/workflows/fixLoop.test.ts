import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateFixPrompt } from "./fixPromptGenerator.js";
import type { ParsedTestFailure } from "./fixPromptGenerator.js";
import type { FixLoopConfig } from "./fixLoop.js";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(""),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@aiteam/adapters", () => ({
  runAgentPrompt: vi.fn().mockResolvedValue({ success: true, output: "fixed" }),
  getChangedFiles: vi.fn().mockResolvedValue(["src/fixed.ts"]),
  generateDiff: vi.fn().mockResolvedValue("diff --git a/src/fixed.ts b/src/fixed.ts\n+fixed"),
  runTests: vi.fn().mockImplementation(() =>
    Promise.resolve({
      overallStatus: "PASSED",
      results: [
        {
          commandName: "unitTest",
          command: "npm test",
          exitCode: 0,
          passed: true,
          durationMs: 100,
          timedOut: false,
          stdoutPath: "",
          stderrPath: "",
          failureSummary: undefined,
        },
      ],
      startedAt: "",
      completedAt: "",
    }),
  ),
}));

let mockReviewStatus: "CHANGES_REQUIRED" | "APPROVED" = "APPROVED";

vi.mock("../review/reviewService.js", () => ({
  loadAndReview: vi.fn().mockImplementation(() =>
    Promise.resolve({
      reviewReport: "review findings",
      securityReview: "",
      requirementCoverage: "",
      overallStatus: mockReviewStatus,
    }),
  ),
  persistReview: vi.fn().mockResolvedValue({
    reviewReportPath: "/fake/review/review-report.md",
    securityReviewPath: "/fake/review/security-review.md",
    requirementCoveragePath: "/fake/review/requirement-coverage.md",
  }),
}));

vi.mock("../artifacts/artifactWriter.js", () => ({
  getArtifactPaths: vi.fn().mockReturnValue({
    runDir: "/fake/runs/test",
    inputFile: "/fake/input.md",
    requirementDir: "/fake/requirement",
    designDir: "/fake/design",
    tasksDir: "/fake/tasks",
    testsDir: "/fake/tests",
    implementationDir: "/fake/implementation",
    implementationPromptPath: "/fake/implementation/implementation-prompt.md",
    agentLogPath: "/fake/implementation/agent-output.log",
    diffPatchPath: "/fake/implementation/diff.patch",
    changedFilesPath: "/fake/implementation/changed-files.json",
    reportDir: "/fake/report",
    logsDir: "/fake/logs",
    traceabilityMd: "/fake/report/traceability.md",
    traceabilityJson: "/fake/report/traceability.json",
    snapshotDir: "/fake/snapshots",
    testResultPath: "/fake/tests/test-result.md",
    failedTestsPath: "/fake/tests/failed-tests.json",
    reviewDir: "/fake/review",
    reviewReportPath: "/fake/review/review-report.md",
    securityReviewPath: "/fake/review/security-review.md",
    requirementCoveragePath: "/fake/review/requirement-coverage.md",
    fixLoopDir: "/fake/implementation/fix-loop",
  }),
  writeArtifact: vi.fn().mockResolvedValue(undefined),
}));

describe("generateFixPrompt", () => {
  it("includes iteration number in prompt", () => {
    const prompt = generateFixPrompt(1, "test-run", "", [], "", "original");
    expect(prompt).toContain("Iteration 1 fix for: test-run");
  });

  it("includes test failures when present", () => {
    const failures: ParsedTestFailure[] = [
      {
        testName: "test1",
        suiteName: "SuiteA",
        message: "assertion failed",
        file: undefined,
        line: undefined,
      },
    ];
    const prompt = generateFixPrompt(2, "run", "", failures, "", "orig");
    expect(prompt).toContain("SuiteA.test1: assertion failed");
  });

  it("includes review findings", () => {
    const prompt = generateFixPrompt(1, "r", "", [], "missing error handling", "orig");
    expect(prompt).toContain("missing error handling");
  });

  it("includes previous diff", () => {
    const prompt = generateFixPrompt(1, "r", "moved line 10", [], "", "orig");
    expect(prompt).toContain("moved line 10");
  });

  it("includes original prompt", () => {
    const prompt = generateFixPrompt(1, "r", "", [], "", "original implementation");
    expect(prompt).toContain("original implementation");
  });

  it("instructs to fix only listed issues", () => {
    const prompt = generateFixPrompt(1, "r", "", [], "", "orig");
    expect(prompt).toContain("Fix only the issues listed above");
  });
});

describe("runFixLoop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReviewStatus = "APPROVED";
  });

  it("returns PASSED when first iteration fixes all issues", async () => {
    const { runFixLoop } = await import("./fixLoop.js");
    const config: FixLoopConfig = {
      maxIterations: 3,
      testCommands: [{ name: "unitTest", command: "npm test", cwd: "/tmp", timeoutSeconds: 60 }],
      aiTool: { tool: "claude", command: "claude", timeoutSeconds: 60 },
    };

    const result = await runFixLoop("test-run-id", "original prompt", config);
    expect(result.finalStatus).toBe("PASSED");
    expect(result.iterations.length).toBe(1);
    expect(result.totalDurationMs).toBeGreaterThan(0);
  });

  it("returns MAX_ITERATIONS_REACHED when fix never passes", async () => {
    mockReviewStatus = "CHANGES_REQUIRED";
    const { runFixLoop } = await import("./fixLoop.js");

    const config: FixLoopConfig = {
      maxIterations: 2,
      testCommands: [{ name: "unitTest", command: "npm test", cwd: "/tmp", timeoutSeconds: 60 }],
      aiTool: { tool: "claude", command: "claude", timeoutSeconds: 60 },
    };

    const result = await runFixLoop("test-run-id", "original prompt", config);
    expect(result.finalStatus).toBe("MAX_ITERATIONS_REACHED");
    expect(result.iterations.length).toBe(2);
  });

  it("iterations contain all required fields", async () => {
    const { runFixLoop } = await import("./fixLoop.js");
    const config: FixLoopConfig = {
      maxIterations: 1,
      testCommands: [{ name: "build", command: "npm run build", cwd: "/tmp", timeoutSeconds: 60 }],
      aiTool: { tool: "claude", command: "claude", timeoutSeconds: 60 },
    };

    const result = await runFixLoop("test-run-id", "original prompt", config);
    expect(result.iterations.length).toBeGreaterThan(0);
    const iter = result.iterations[0];
    expect(iter).toBeDefined();
    if (!iter) return;
    expect(typeof iter.iteration).toBe("number");
    expect(typeof iter.fixPrompt).toBe("string");
    expect(typeof iter.gitDiff).toBe("string");
    expect(typeof iter.passed).toBe("boolean");
    expect(iter.testResult).toBeDefined();
    expect(iter.reviewResult).toBeDefined();
  });

  it("generates fix prompt for each iteration", async () => {
    const { runFixLoop } = await import("./fixLoop.js");
    const config: FixLoopConfig = {
      maxIterations: 1,
      testCommands: [{ name: "build", command: "npm run build", cwd: "/tmp", timeoutSeconds: 60 }],
      aiTool: { tool: "claude", command: "claude", timeoutSeconds: 60 },
    };

    const result = await runFixLoop("test-run-id", "original prompt", config);
    expect(result.iterations.length).toBeGreaterThan(0);
    expect(result.iterations[0]).toBeDefined();
    expect(result.iterations[0]?.fixPrompt).toContain("original prompt");
  });
});
