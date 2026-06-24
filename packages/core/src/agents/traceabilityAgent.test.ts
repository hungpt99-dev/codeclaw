import { describe, it, expect } from "vitest";
import { runTraceabilityAgent, traceabilityToEnhancedMarkdown } from "./traceabilityAgent.js";
import type { ArtifactPaths } from "../artifacts/artifactWriter.js";
import type { TraceabilityMatrix } from "@aiteam/shared";

const mockArtifactPaths: ArtifactPaths = {
  runDir: ".ai-team/runs/test-run",
  inputFile: ".ai-team/runs/test-run/input.md",
  requirementDir: ".ai-team/runs/test-run/requirement",
  scopeDir: ".ai-team/runs/test-run/scope",
  scopeDefinitionPath: ".ai-team/runs/test-run/scope/product-goal.md",
  outOfScopePath: ".ai-team/runs/test-run/scope/out-of-scope.md",
  successCriteriaPath: ".ai-team/runs/test-run/scope/success-criteria.md",
  designDir: ".ai-team/runs/test-run/design",
  tasksDir: ".ai-team/runs/test-run/tasks",
  testsDir: ".ai-team/runs/test-run/tests",
  implementationDir: ".ai-team/runs/test-run/implementation",
  implementationPromptPath: ".ai-team/runs/test-run/implementation/implementation-prompt.md",
  agentLogPath: ".ai-team/runs/test-run/implementation/agent-output.log",
  diffPatchPath: ".ai-team/runs/test-run/implementation/diff.patch",
  changedFilesPath: ".ai-team/runs/test-run/implementation/changed-files.json",
  reportDir: ".ai-team/runs/test-run/report",
  logsDir: ".ai-team/runs/test-run/logs",
  traceabilityMd: ".ai-team/runs/test-run/report/traceability.md",
  traceabilityJson: ".ai-team/runs/test-run/report/traceability.json",
  snapshotDir: ".ai-team/runs/test-run/snapshots",
  testResultPath: ".ai-team/runs/test-run/tests/test-result.md",
  failedTestsPath: ".ai-team/runs/test-run/tests/failed-tests.json",
  reviewDir: ".ai-team/runs/test-run/review",
  reviewReportPath: ".ai-team/runs/test-run/review/review-report.md",
  securityReviewPath: ".ai-team/runs/test-run/review/security-review.md",
  requirementCoveragePath: ".ai-team/runs/test-run/review/requirement-coverage.md",
  fixLoopDir: ".ai-team/runs/test-run/implementation/fix-loop",
  uxDir: ".ai-team/runs/test-run/ux",
  userJourneyPath: ".ai-team/runs/test-run/ux/user-journey.md",
  uxDesignPath: ".ai-team/runs/test-run/ux/ux-design.md",
  uxCopyPath: ".ai-team/runs/test-run/ux/ux-copy.md",
  componentBreakdownPath: ".ai-team/runs/test-run/ux/component-breakdown.md",
  frontendDesignPath: ".ai-team/runs/test-run/design/frontend-design.md",
  backendDesignPath: ".ai-team/runs/test-run/design/backend-design.md",
  integrationPlanPath: ".ai-team/runs/test-run/integration/integration-plan.md",
  releasePlanPath: ".ai-team/runs/test-run/release/release-plan.md",
  changelogPath: ".ai-team/runs/test-run/release/changelog.md",
  docsDir: ".ai-team/runs/test-run/docs",
  apiReferencePath: ".ai-team/runs/test-run/docs/api-reference.md",
  setupGuidePath: ".ai-team/runs/test-run/docs/setup-guide.md",
  technicalReferencePath: ".ai-team/runs/test-run/docs/technical-reference.md",
  operationsGuidePath: ".ai-team/runs/test-run/docs/operations-guide.md",
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
