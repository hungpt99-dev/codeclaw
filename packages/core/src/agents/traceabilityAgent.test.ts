import { describe, it, expect } from "vitest";
import { runTraceabilityAgent, traceabilityToEnhancedMarkdown } from "./traceabilityAgent.js";
import type { ArtifactPaths } from "../artifacts/artifactWriter.js";
import type { TraceabilityMatrix } from "@codeclaw/shared";

const mockArtifactPaths: ArtifactPaths = {
  runDir: ".codeclaw/runs/test-run",
  inputFile: ".codeclaw/runs/test-run/input.md",
  requirementDir: ".codeclaw/runs/test-run/requirement",
  scopeDir: ".codeclaw/runs/test-run/scope",
  scopeDefinitionPath: ".codeclaw/runs/test-run/scope/product-goal.md",
  outOfScopePath: ".codeclaw/runs/test-run/scope/out-of-scope.md",
  successCriteriaPath: ".codeclaw/runs/test-run/scope/success-criteria.md",
  designDir: ".codeclaw/runs/test-run/design",
  tasksDir: ".codeclaw/runs/test-run/tasks",
  testsDir: ".codeclaw/runs/test-run/tests",
  codingPlanDir: ".codeclaw/runs/test-run/coding-plan",
  codingPlanPath: ".codeclaw/runs/test-run/coding-plan/coding-plan.md",
  implementationDir: ".codeclaw/runs/test-run/implementation",
  implementationPromptPath: ".codeclaw/runs/test-run/implementation/implementation-prompt.md",
  agentLogPath: ".codeclaw/runs/test-run/implementation/agent-output.log",
  diffPatchPath: ".codeclaw/runs/test-run/implementation/diff.patch",
  changedFilesPath: ".codeclaw/runs/test-run/implementation/changed-files.json",
  reportDir: ".codeclaw/runs/test-run/report",
  logsDir: ".codeclaw/runs/test-run/logs",
  traceabilityMd: ".codeclaw/runs/test-run/report/traceability.md",
  traceabilityJson: ".codeclaw/runs/test-run/report/traceability.json",
  snapshotDir: ".codeclaw/runs/test-run/snapshots",
  testResultPath: ".codeclaw/runs/test-run/tests/test-result.md",
  failedTestsPath: ".codeclaw/runs/test-run/tests/failed-tests.json",
  reviewDir: ".codeclaw/runs/test-run/review",
  reviewReportPath: ".codeclaw/runs/test-run/review/review-report.md",
  securityReviewPath: ".codeclaw/runs/test-run/review/security-review.md",
  requirementCoveragePath: ".codeclaw/runs/test-run/review/requirement-coverage.md",
  fixLoopDir: ".codeclaw/runs/test-run/implementation/fix-loop",
  uxDir: ".codeclaw/runs/test-run/ux",
  userJourneyPath: ".codeclaw/runs/test-run/ux/user-journey.md",
  uxDesignPath: ".codeclaw/runs/test-run/ux/ux-design.md",
  uxCopyPath: ".codeclaw/runs/test-run/ux/ux-copy.md",
  componentBreakdownPath: ".codeclaw/runs/test-run/ux/component-breakdown.md",
  frontendDesignPath: ".codeclaw/runs/test-run/design/frontend-design.md",
  backendDesignPath: ".codeclaw/runs/test-run/design/backend-design.md",
  integrationPlanPath: ".codeclaw/runs/test-run/integration/integration-plan.md",
  releasePlanPath: ".codeclaw/runs/test-run/release/release-plan.md",
  changelogPath: ".codeclaw/runs/test-run/release/changelog.md",
  docsDir: ".codeclaw/runs/test-run/docs",
  apiReferencePath: ".codeclaw/runs/test-run/docs/api-reference.md",
  setupGuidePath: ".codeclaw/runs/test-run/docs/setup-guide.md",
  technicalReferencePath: ".codeclaw/runs/test-run/docs/technical-reference.md",
  operationsGuidePath: ".codeclaw/runs/test-run/docs/operations-guide.md",
};

const mockMatrix: TraceabilityMatrix = {
  runId: "test-run",
  items: [
    {
      requirementId: "REQ-001",
      requirementText: "User login",
      acceptanceCriteriaIds: ["AC-001", "AC-002"],
      taskIds: ["TASK-001", "TASK-002"],
      codeFiles: ["src/login.ts"],
      testCases: ["TC-001"],
      testResults: [],
      status: "COVERED",
    },
    {
      requirementId: "REQ-002",
      requirementText: "Password reset",
      acceptanceCriteriaIds: ["AC-003"],
      taskIds: [],
      codeFiles: [],
      testCases: [],
      testResults: [],
      status: "NOT_COVERED",
    },
  ],
  generatedAt: new Date().toISOString(),
  summary: { total: 2, covered: 1, partial: 0, notCovered: 1 },
};

describe("runTraceabilityAgent (deterministic fallback)", () => {
  it("returns structured output without AI tool", async () => {
    const result = await runTraceabilityAgent({
      runId: "test-run",
      artifactPaths: mockArtifactPaths,
      existingMatrix: mockMatrix,
    });

    expect(result).toHaveProperty("matrix");
    expect(result).toHaveProperty("markdown");
    expect(result).toHaveProperty("coverageAnalysis");
    expect(result).toHaveProperty("gapDetection");
    expect(result).toHaveProperty("recommendations");
  });

  it("generates coverage analysis with correct numbers", async () => {
    const result = await runTraceabilityAgent({
      runId: "test-run",
      artifactPaths: mockArtifactPaths,
      existingMatrix: mockMatrix,
    });

    expect(result.coverageAnalysis).toContain("50%");
    expect(result.coverageAnalysis).toContain("REQ-001");
    expect(result.coverageAnalysis).toContain("REQ-002");
  });

  it("detects gaps in coverage", async () => {
    const result = await runTraceabilityAgent({
      runId: "test-run",
      artifactPaths: mockArtifactPaths,
      existingMatrix: mockMatrix,
    });

    expect(result.gapDetection).toContain("REQ-002");
  });

  it("generates actionable recommendations for uncovered requirements", async () => {
    const result = await runTraceabilityAgent({
      runId: "test-run",
      artifactPaths: mockArtifactPaths,
      existingMatrix: mockMatrix,
    });

    expect(result.recommendations).toContain("uncovered requirement");
    expect(result.recommendations).toContain("no code files");
  });

  it("handles empty matrix", async () => {
    const emptyMatrix: TraceabilityMatrix = {
      runId: "empty-run",
      items: [],
      generatedAt: new Date().toISOString(),
      summary: { total: 0, covered: 0, partial: 0, notCovered: 0 },
    };

    const result = await runTraceabilityAgent({
      runId: "empty-run",
      artifactPaths: mockArtifactPaths,
      existingMatrix: emptyMatrix,
    });

    expect(result.coverageAnalysis).toContain("0%");
    expect(result.gapDetection).toBeTruthy();
    expect(result.recommendations).toContain("No actionable recommendations");
  });
});

describe("traceabilityToEnhancedMarkdown", () => {
  it("combines matrix and analysis into single markdown", async () => {
    const result = await runTraceabilityAgent({
      runId: "test-run",
      artifactPaths: mockArtifactPaths,
      existingMatrix: mockMatrix,
    });

    const md = traceabilityToEnhancedMarkdown(result);
    expect(md).toContain("# Traceability Matrix");
    expect(md).toContain("## Coverage Analysis");
    expect(md).toContain("## Gap Detection");
    expect(md).toContain("## Recommendations");
    expect(md).toContain("REQ-001");
    expect(md).toContain("REQ-002");
  });
});
