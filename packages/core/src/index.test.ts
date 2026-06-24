import { describe, it, expect, afterEach } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { renderPrompt } from "./prompts/promptRenderer.js";
import { getArtifactPaths, createArtifactDirs, writeArtifact } from "./artifacts/artifactWriter.js";
import { runDocsOnlyWorkflow } from "./workflows/docsOnlyWorkflow.js";
import { runBaAgent } from "./agents/baAgent.js";
import { runArchitectAgent } from "./agents/architectAgent.js";
import { runPmAgent } from "./agents/pmAgent.js";
import { runQaAgent } from "./agents/qaAgent.js";
import { runReporterAgent } from "./agents/reporterAgent.js";
import { runDeveloperAgent } from "./agents/developerAgent.js";
import { runAssistedWorkflow } from "./workflows/assistedWorkflow.js";
import { readFile, access } from "node:fs/promises";

const TEST_RUN_ID = "run_20250101_000000_test_requirement";

async function cleanupTestDirs(): Promise<void> {
  try {
    await rm(join(".ai-team", "runs"), { recursive: true, force: true });
  } catch {
    // ignore if doesn't exist
  }
}

describe("renderPrompt", () => {
  it("replaces placeholders with context values", () => {
    const result = renderPrompt("Hello {{name}}!", { name: "World" });
    expect(result).toBe("Hello World!");
  });

  it("replaces multiple placeholders", () => {
    const template = "{{greeting}} {{name}}. Your order #{{orderId}} is ready.";
    const context = { greeting: "Hi", name: "Alice", orderId: "12345" };
    const result = renderPrompt(template, context);
    expect(result).toBe("Hi Alice. Your order #12345 is ready.");
  });

  it("leaves unmatched placeholders unchanged", () => {
    const result = renderPrompt("Hello {{name}}, {{missing}}!", { name: "World" });
    expect(result).toBe("Hello World, {{missing}}!");
  });

  it("returns template unchanged when context is empty", () => {
    const result = renderPrompt("Hello {{name}}!", {});
    expect(result).toBe("Hello {{name}}!");
  });

  it("handles template with no placeholders", () => {
    const result = renderPrompt("Hello World!", { name: "ignored" });
    expect(result).toBe("Hello World!");
  });

  it("handles repeated placeholders", () => {
    const result = renderPrompt("{{x}} + {{x}} = 2{{x}}", { x: "1" });
    expect(result).toBe("1 + 1 = 21");
  });

  it("handles multi-line templates", () => {
    const template = "# {{title}}\n\nContent by {{author}}\n\n## {{title}}";
    const result = renderPrompt(template, { title: "Report", author: "Team" });
    expect(result).toBe("# Report\n\nContent by Team\n\n## Report");
  });
});

describe("artifactWriter", () => {
  afterEach(async () => {
    await cleanupTestDirs();
  });

  it("getArtifactPaths returns correct paths", () => {
    const paths = getArtifactPaths(TEST_RUN_ID);
    expect(paths.runDir).toBe(join(".ai-team", "runs", TEST_RUN_ID));
    expect(paths.inputFile).toBe(join(".ai-team", "runs", TEST_RUN_ID, "input.md"));
    expect(paths.requirementDir).toBe(join(".ai-team", "runs", TEST_RUN_ID, "requirement"));
    expect(paths.designDir).toBe(join(".ai-team", "runs", TEST_RUN_ID, "design"));
    expect(paths.tasksDir).toBe(join(".ai-team", "runs", TEST_RUN_ID, "tasks"));
    expect(paths.testsDir).toBe(join(".ai-team", "runs", TEST_RUN_ID, "tests"));
    expect(paths.reportDir).toBe(join(".ai-team", "runs", TEST_RUN_ID, "report"));
    expect(paths.logsDir).toBe(join(".ai-team", "runs", TEST_RUN_ID, "logs"));
  });

  it("createArtifactDirs creates all directories", async () => {
    const paths = await createArtifactDirs(TEST_RUN_ID);
    await expect(access(paths.runDir)).resolves.toBeUndefined();
    await expect(access(paths.requirementDir)).resolves.toBeUndefined();
    await expect(access(paths.designDir)).resolves.toBeUndefined();
    await expect(access(paths.tasksDir)).resolves.toBeUndefined();
    await expect(access(paths.testsDir)).resolves.toBeUndefined();
    await expect(access(paths.reportDir)).resolves.toBeUndefined();
    await expect(access(paths.logsDir)).resolves.toBeUndefined();
  });

  it("writeArtifact writes content to file", async () => {
    const paths = await createArtifactDirs(TEST_RUN_ID);
    const filePath = join(paths.requirementDir, "test.md");
    await writeArtifact(filePath, "# Test Content");
    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("# Test Content");
  });
});

describe("docsOnlyWorkflow", () => {
  afterEach(async () => {
    await cleanupTestDirs();
  });

  const defaultInput = {
    requirement: "Build a login page",
    projectRoot: undefined as string | undefined,
    memoryContext: undefined as
      | { projectMemoryCount: number; decisionMemoryCount: number; agentMemoryCount: number }
      | undefined,
  };

  it("returns output with runId, status, artifacts, and timestamps", async () => {
    const result = await runDocsOnlyWorkflow(defaultInput);

    expect(result.runId).toMatch(/^run_\d{8}_\d{6}_build_a_login_page$/);
    expect(result.status).toBe("REPORT_GENERATED");
    expect(result.createdAt).toBeTruthy();
    expect(result.completedAt).toBeTruthy();
    expect(Array.isArray(result.artifacts)).toBe(true);
  });

  it("creates exactly 17 artifact files", async () => {
    const result = await runDocsOnlyWorkflow(defaultInput);

    expect(result.artifacts).toHaveLength(25);
  });

  it("creates all expected artifact paths", async () => {
    const result = await runDocsOnlyWorkflow(defaultInput);

    const expectedPaths = [
      join(".ai-team", "runs", result.runId, "input.md"),
      join(".ai-team", "runs", result.runId, "requirement", "clarified-requirement.md"),
      join(".ai-team", "runs", result.runId, "requirement", "business-rules.md"),
      join(".ai-team", "runs", result.runId, "requirement", "acceptance-criteria.md"),
      join(".ai-team", "runs", result.runId, "requirement", "open-questions.md"),
      join(".ai-team", "runs", result.runId, "requirement", "assumptions.md"),
      join(".ai-team", "runs", result.runId, "scope", "product-goal.md"),
      join(".ai-team", "runs", result.runId, "scope", "mvp-scope.md"),
      join(".ai-team", "runs", result.runId, "scope", "out-of-scope.md"),
      join(".ai-team", "runs", result.runId, "scope", "success-criteria.md"),
      join(".ai-team", "runs", result.runId, "design", "technical-design.md"),
      join(".ai-team", "runs", result.runId, "design", "api-design.md"),
      join(".ai-team", "runs", result.runId, "design", "db-design.md"),
      join(".ai-team", "runs", result.runId, "tasks", "task-breakdown.md"),
      join(".ai-team", "runs", result.runId, "tasks", "task-breakdown.json"),
      join(".ai-team", "runs", result.runId, "tasks", "jira-ready-tasks.md"),
      join(".ai-team", "runs", result.runId, "tests", "test-matrix.md"),
      join(".ai-team", "runs", result.runId, "tests", "test-matrix.json"),
      join(".ai-team", "runs", result.runId, "report", "traceability.md"),
      join(".ai-team", "runs", result.runId, "report", "traceability.json"),
      join(".ai-team", "runs", result.runId, "report", "final-report.md"),
      join(".ai-team", "runs", result.runId, "ux", "user-journey.md"),
      join(".ai-team", "runs", result.runId, "ux", "ux-design.md"),
      join(".ai-team", "runs", result.runId, "ux", "component-breakdown.md"),
      join(".ai-team", "runs", result.runId, "ux", "ux-copy.md"),
    ];

    for (const expectedPath of expectedPaths) {
      expect(result.artifacts).toContain(expectedPath);
    }
  });

  it("writes non-empty content to all artifact files", async () => {
    const result = await runDocsOnlyWorkflow(defaultInput);

    for (const artifactPath of result.artifacts) {
      const content = await readFile(artifactPath, "utf-8");
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it("includes requirement text in input.md", async () => {
    const result = await runDocsOnlyWorkflow(defaultInput);

    const inputContent = await readFile(
      join(".ai-team", "runs", result.runId, "input.md"),
      "utf-8",
    );
    expect(inputContent).toContain("Build a login page");
  });

  it("generates valid JSON for task-breakdown.json", async () => {
    const result = await runDocsOnlyWorkflow(defaultInput);

    const jsonContent = await readFile(
      join(".ai-team", "runs", result.runId, "tasks", "task-breakdown.json"),
      "utf-8",
    );
    const parsed: Record<string, unknown> = JSON.parse(jsonContent) as Record<string, unknown>;
    expect(parsed).toHaveProperty("epic");
    expect(parsed).toHaveProperty("phases");
    expect(parsed).toHaveProperty("totalTasks", 13);
    expect(parsed).toHaveProperty("totalEstimatedHours", 57);
  });

  it("generates valid JSON for test-matrix.json", async () => {
    const result = await runDocsOnlyWorkflow(defaultInput);

    const jsonContent = await readFile(
      join(".ai-team", "runs", result.runId, "tests", "test-matrix.json"),
      "utf-8",
    );
    const parsed: Record<string, unknown> = JSON.parse(jsonContent) as Record<string, unknown>;
    expect(parsed).toHaveProperty("unitTests");
    expect(parsed).toHaveProperty("integrationTests");
    expect(parsed).toHaveProperty("edgeCases");
    expect(parsed).toHaveProperty("nonFunctionalTests");
  });

  it("generates different runIds for different requirements", async () => {
    const result1 = await runDocsOnlyWorkflow(defaultInput);
    const result2 = await runDocsOnlyWorkflow({
      ...defaultInput,
      requirement: "Build a dashboard",
    });

    expect(result1.runId).not.toBe(result2.runId);
  });
});

describe("agents", () => {
  it("baAgent returns all expected output fields", async () => {
    const output = await runBaAgent({ requirement: "Test requirement" });
    expect(output).toHaveProperty("clarifiedRequirement");
    expect(output).toHaveProperty("businessRules");
    expect(output).toHaveProperty("acceptanceCriteria");
    expect(output).toHaveProperty("openQuestions");
    expect(output).toHaveProperty("assumptions");
    expect(output.clarifiedRequirement).toContain("Test requirement");
    expect(output.businessRules).toContain("Test requirement");
    expect(output.acceptanceCriteria).toContain("Test requirement");
    expect(output.openQuestions).toContain("Test requirement");
    expect(output.assumptions).toContain("Test requirement");
  });

  it("architectAgent returns all expected output fields", async () => {
    const output = await runArchitectAgent({
      requirement: "Test requirement",
      clarifiedRequirement: "Clarified",
    });
    expect(output).toHaveProperty("technicalDesign");
    expect(output).toHaveProperty("apiDesign");
    expect(output).toHaveProperty("dbDesign");
    expect(output.technicalDesign).toContain("Test requirement");
    expect(output.apiDesign).toContain("Test requirement");
    expect(output.dbDesign).toContain("Test requirement");
  });

  it("pmAgent returns markdown and JSON task breakdown", async () => {
    const output = await runPmAgent({
      requirement: "Test requirement",
      technicalDesign: "Design",
    });
    expect(output).toHaveProperty("taskBreakdownMd");
    expect(output).toHaveProperty("taskBreakdownJson");
    expect(output.taskBreakdownMd).toContain("Test requirement");
    const parsed: Record<string, unknown> = JSON.parse(output.taskBreakdownJson) as Record<
      string,
      unknown
    >;
    expect(parsed.totalTasks).toBe(13);
  });

  it("qaAgent returns markdown and JSON test matrix", async () => {
    const output = await runQaAgent({
      requirement: "Test requirement",
      acceptanceCriteria: "Criteria",
      taskBreakdownJson: "{}",
    });
    expect(output).toHaveProperty("testMatrixMd");
    expect(output).toHaveProperty("testMatrixJson");
    expect(output.testMatrixMd).toContain("Test requirement");
    const parsed: Record<string, unknown> = JSON.parse(output.testMatrixJson) as Record<
      string,
      unknown
    >;
    expect(parsed.unitTests).toHaveLength(6);
  });

  it("reporterAgent returns final report", async () => {
    const output = await runReporterAgent({
      requirement: "Test requirement",
      clarifiedRequirement: "Clarified",
      businessRules: "Rules",
      acceptanceCriteria: "Criteria",
      technicalDesign: "Design",
      apiDesign: "API",
      dbDesign: "DB",
      taskBreakdownMd: "Tasks",
      testMatrixMd: "Tests",
    });
    expect(output).toHaveProperty("finalReport");
    expect(output.finalReport).toContain("Test requirement");
    expect(output.finalReport).toContain("Docs-only");
  });

  it("developerAgent returns implementation prompt with all inputs", async () => {
    const output = await runDeveloperAgent({
      requirement: "Build a login page",
      clarifiedRequirement: "The system should allow users to log in with email and password",
      businessRules: "Passwords must be at least 8 characters",
      acceptanceCriteria: "AC-001: User can log in with valid credentials",
      technicalDesign: "Use JWT token authentication",
      apiDesign: "POST /api/auth/login",
      dbDesign: "Users table with email and password_hash",
      taskBreakdownMd: "T-001: Create login endpoint",
      testMatrixMd: "TC-001: Valid login returns token",
    });
    expect(output).toHaveProperty("implementationPrompt");
    expect(output.implementationPrompt).toContain("Build a login page");
    expect(output.implementationPrompt).toContain("POST /api/auth/login");
    expect(output.implementationPrompt).toContain("Implementation Prompt");
  });

  it("developerAgent targetAgent parameter does not affect deterministic output", async () => {
    const output = await runDeveloperAgent({
      requirement: "Test",
      clarifiedRequirement: "Clarified",
      businessRules: "Rules",
      acceptanceCriteria: "Criteria",
      technicalDesign: "Design",
      apiDesign: "API",
      dbDesign: "DB",
      taskBreakdownMd: "Tasks",
      testMatrixMd: "Tests",
      targetAgent: "claude-code",
    });
    expect(output).toHaveProperty("implementationPrompt");
    expect(output.implementationPrompt).toContain("Implementation Prompt");
  });
});

describe("assistedWorkflow", () => {
  afterEach(async () => {
    try {
      await rm(join(".ai-team", "runs"), { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  const defaultInput = {
    requirement: "Build a login page",
    projectRoot: undefined as string | undefined,
    memoryContext: undefined as
      | { projectMemoryCount: number; decisionMemoryCount: number; agentMemoryCount: number }
      | undefined,
  };

  it("returns output with runId, status, artifacts, and timestamps", async () => {
    const result = await runAssistedWorkflow(defaultInput);

    expect(result.runId).toMatch(/^run_\d{8}_\d{6}_build_a_login_page$/);
    expect(result.status).toBe("REPORT_GENERATED");
    expect(result.createdAt).toBeTruthy();
    expect(result.completedAt).toBeTruthy();
    expect(Array.isArray(result.artifacts)).toBe(true);
  });

  it("creates more artifacts than docs-only workflow (includes implementation-prompt.md)", async () => {
    const result = await runAssistedWorkflow(defaultInput);

    expect(result.artifacts.length).toBeGreaterThan(14);
  });

  it("generates implementation-prompt.md artifact", async () => {
    const result = await runAssistedWorkflow(defaultInput);

    const implPromptArtifact = result.artifacts.find((a) => a.endsWith("implementation-prompt.md"));
    expect(implPromptArtifact).toBeTruthy();

    if (implPromptArtifact) {
      const content = await readFile(implPromptArtifact, "utf-8");
      expect(content).toContain("Build a login page");
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it("generates all standard artifacts plus implementation prompt", async () => {
    const result = await runAssistedWorkflow(defaultInput);

    const expectedPaths = [
      ".ai-team/runs/" + result.runId + "/input.md",
      ".ai-team/runs/" + result.runId + "/requirement/clarified-requirement.md",
      ".ai-team/runs/" + result.runId + "/requirement/business-rules.md",
      ".ai-team/runs/" + result.runId + "/requirement/acceptance-criteria.md",
      ".ai-team/runs/" + result.runId + "/requirement/open-questions.md",
      ".ai-team/runs/" + result.runId + "/requirement/assumptions.md",
      ".ai-team/runs/" + result.runId + "/design/technical-design.md",
      ".ai-team/runs/" + result.runId + "/design/api-design.md",
      ".ai-team/runs/" + result.runId + "/design/db-design.md",
      ".ai-team/runs/" + result.runId + "/tasks/task-breakdown.md",
      ".ai-team/runs/" + result.runId + "/tasks/task-breakdown.json",
      ".ai-team/runs/" + result.runId + "/tests/test-matrix.md",
      ".ai-team/runs/" + result.runId + "/tests/test-matrix.json",
      ".ai-team/runs/" + result.runId + "/implementation/implementation-prompt.md",
      ".ai-team/runs/" + result.runId + "/report/final-report.md",
    ];

    for (const expectedPath of expectedPaths) {
      expect(result.artifacts).toContain(expectedPath);
    }
  });

  it("writes non-empty content to implementation-prompt.md", async () => {
    const result = await runAssistedWorkflow(defaultInput);

    const implPromptArtifact = result.artifacts.find((a) => a.endsWith("implementation-prompt.md"));
    expect(implPromptArtifact).toBeTruthy();

    if (implPromptArtifact) {
      const content = await readFile(implPromptArtifact, "utf-8");
      expect(content.length).toBeGreaterThan(100);
    }
  });
});
