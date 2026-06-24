import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSemiAutoWorkflow } from "./semiAutoWorkflow.js";

vi.mock("@codeclaw/adapters", () => ({
  getChangedFiles: vi.fn().mockResolvedValue(["src/test.ts"]),
  generateDiff: vi.fn().mockResolvedValue(""),
  getGitStatus: vi.fn().mockResolvedValue({ clean: true, branch: "main" }),
  saveGitSnapshot: vi.fn().mockResolvedValue(undefined),
  renderPrompt: vi.fn().mockImplementation((_template: string, context: Record<string, string>) => {
    const values = Object.values(context).filter(Boolean);
    return values.join("\n\n") || "mocked prompt";
  }),
  runAgent: vi.fn().mockResolvedValue({ success: false, usedAi: false, output: "" }),
}));

vi.mock("../../agents/baAgent.js", () => ({
  runBaAgent: vi.fn().mockResolvedValue({
    clarifiedRequirement: "# Clarified\nTest",
    businessRules: "Rule 1",
    acceptanceCriteria: "AC 1",
    openQuestions: "Q?",
    assumptions: "Assume X",
  }),
}));

vi.mock("../../agents/architectAgent.js", () => ({
  runArchitectAgent: vi.fn().mockResolvedValue({
    technicalDesign: "# Design",
    apiDesign: "API",
    dbDesign: "DB",
  }),
}));

vi.mock("../../agents/pmAgent.js", () => ({
  runPmAgent: vi.fn().mockResolvedValue({
    taskBreakdownMd: "# Tasks",
    taskBreakdownJson: JSON.stringify([{ id: "T1" }]),
  }),
}));

vi.mock("../../agents/qaAgent.js", () => ({
  runQaAgent: vi.fn().mockResolvedValue({
    testMatrixMd: "# Tests",
    testMatrixJson: JSON.stringify([{ id: "TC1" }]),
  }),
}));

vi.mock("../../agents/developerAgent.js", () => ({
  runDeveloperAgent: vi.fn().mockResolvedValue({
    implementationPrompt: "# Implementation Prompt\n\nDo the thing.",
  }),
}));

vi.mock("../../agents/reporterAgent.js", () => ({
  runReporterAgent: vi.fn().mockResolvedValue({
    finalReport: "# Final Report\nDone.",
  }),
}));

vi.mock("../../traceability/traceabilityEngine.js", () => ({
  generateTraceability: vi.fn().mockResolvedValue({
    runId: "test",
    items: [],
    generatedAt: new Date().toISOString(),
    summary: { total: 0, covered: 0, partial: 0, notCovered: 0 },
  }),
  traceabilityToMarkdown: vi.fn().mockReturnValue("# Traceability"),
}));

vi.mock("../../repoAnalyzer/repoAnalyzer.js", () => ({
  analyzeRepository: vi.fn().mockResolvedValue({
    projectType: "generic",
    language: "typescript",
    framework: null,
    buildTool: null,
    testFramework: null,
    migrationTool: null,
    sourceDirs: ["src"],
    testDirs: ["test"],
    configFiles: [],
    detectedPatterns: [],
    packageManager: null,
    nodeVersion: null,
    javaVersion: null,
  }),
  analysisToMarkdown: vi.fn().mockReturnValue("# Analysis"),
}));

describe("runSemiAutoWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns pending gate when approval is required", async () => {
    const result = await runSemiAutoWorkflow({
      requirement: "Add login page",
      projectRoot: undefined,
      selectedAgent: "claude",
      memoryContext: undefined,
      approvalConfig: { requireCodeApproval: true },
    });

    expect(result.status).toBe("WAITING_FOR_CODE_APPROVAL");
    expect(result.pendingGate).toBeDefined();
    expect(result.pendingGate?.gate).toBe("CODE_GENERATION");
    expect(result.pendingGate?.status).toBe("PENDING");
    expect(result.artifacts.length).toBeGreaterThan(0);
  });

  it("proceeds with code execution when approval is not required", async () => {
    const result = await runSemiAutoWorkflow({
      requirement: "Add login page",
      projectRoot: "/tmp/test-project",
      selectedAgent: "claude",
      memoryContext: undefined,
      approvalConfig: { requireCodeApproval: false },
    });

    expect(result.codeGenerationResult).toBeDefined();
    expect(typeof result.codeGenerationResult?.success).toBe("boolean");
  });

  it("generates all doc artifacts before code", async () => {
    const result = await runSemiAutoWorkflow({
      requirement: "Test feature",
      projectRoot: undefined,
      selectedAgent: "claude",
      memoryContext: undefined,
      approvalConfig: { requireCodeApproval: true },
    });

    expect(result.artifacts.length).toBeGreaterThan(5);
    expect(result.artifacts.some((a) => a.includes("input.md"))).toBe(true);
    expect(result.artifacts.some((a) => a.includes("clarified-requirement.md"))).toBe(true);
    expect(result.artifacts.some((a) => a.includes("technical-design.md"))).toBe(true);
    expect(result.artifacts.some((a) => a.includes("implementation-prompt.md"))).toBe(true);
  });

  it("includes memoryUsed when memoryContext is provided", async () => {
    const result = await runSemiAutoWorkflow({
      requirement: "Test",
      projectRoot: undefined,
      selectedAgent: "claude",
      memoryContext: {
        projectMemoryCount: 5,
        decisionMemoryCount: 3,
        agentMemoryCount: 2,
      },
      approvalConfig: { requireCodeApproval: true },
    });

    expect(result.memoryUsed).toBeDefined();
    expect(result.memoryUsed?.projectMemoryFiles).toBe(5);
  });
});
