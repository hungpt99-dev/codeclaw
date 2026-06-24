import { join } from "node:path";
import { createRunId, nowIso } from "@aiteam/shared";
import type {
  ApprovalGate,
  AiAdapterName,
  SlackIntegrationConfig,
  TestCommandResult,
} from "@aiteam/shared";
import { createArtifactDirs, writeArtifact } from "../artifacts/artifactWriter.js";
import type { ArtifactPaths } from "../artifacts/artifactWriter.js";
import { runBaAgent } from "../agents/baAgent.js";
import { runArchitectAgent } from "../agents/architectAgent.js";
import { runFrontendPlannerAgent } from "../agents/frontendPlannerAgent.js";
import { runBackendPlannerAgent } from "../agents/backendPlannerAgent.js";
import { runIntegrationPlannerAgent } from "../agents/integrationPlannerAgent.js";
import { runDevopsReleaseAgent } from "../agents/devopsReleaseAgent.js";
import { runPmAgent } from "../agents/pmAgent.js";
import { runQaAgent } from "../agents/qaAgent.js";
import { runCodingPlanAgent } from "../agents/codingPlanAgent.js";
import { runDeveloperAgent } from "../agents/developerAgent.js";
import { runReporterAgent } from "../agents/reporterAgent.js";
import { runTechnicalDocumentationAgent } from "../agents/technicalDocumentationAgent.js";
import {
  runTraceabilityAgent,
  traceabilityToEnhancedMarkdown,
} from "../agents/traceabilityAgent.js";
import { analyzeRepository, analysisToMarkdown } from "../repoAnalyzer/repoAnalyzer.js";
import { getAiToolConfig, resolvePlannerSelection } from "./workflowHelpers.js";
import type { AiToolConfig, PlannerSelection } from "./workflowHelpers.js";
import { checkFileSafety, checkCommandSafety } from "../policies/safetyPolicy.js";
import type { SafetyPolicy, FileSafetyResult } from "../policies/safetyPolicy.js";
import { buildReportReadyMessage } from "../integrations/slackMessageTemplates.js";
import type { SlackMessageInput } from "../integrations/slackMessageTemplates.js";
import { loadAndReview, persistReview } from "../review/reviewService.js";
import { runFixLoop } from "./fixLoop.js";
import type { FixLoopResult } from "./fixLoop.js";

export interface SemiAutoWorkflowInput {
  requirement: string;
  projectRoot: string | undefined;
  selectedAgent: AiAdapterName;
  memoryContext:
    | {
        projectMemoryCount: number;
        decisionMemoryCount: number;
        agentMemoryCount: number;
      }
    | undefined;
  templateDir?: string;
  agentMapping?: Record<string, string>;
  cliConfigs?: Record<string, { enabled: boolean; command: string; timeoutSeconds: number }>;
  approvalConfig?: {
    requireCodeApproval: boolean;
  };
  safetyPolicy?: SafetyPolicy;
  commandTimeoutSeconds?: number;
  slackConfig?: SlackIntegrationConfig;
  testCommands?: {
    build: string;
    unitTest: string;
    integrationTest: string;
    lint: string;
  };
  skipTests?: boolean;
  maxIterations?: number;
  noFixLoop?: boolean;
  plannerSelection?: PlannerSelection;
  generateIntegrationPlan?: boolean;
  generateReleasePlan?: boolean;
  generateDocumentation?: boolean;
}

export interface SemiAutoWorkflowOutput {
  runId: string;
  status: string;
  artifacts: string[];
  createdAt: string;
  completedAt: string;
  pendingGate?: {
    gate: ApprovalGate;
    status: "PENDING";
    summary: string;
    artifacts: string[];
  };
  codeGenerationResult:
    | {
        success: boolean;
        changedFiles: string[];
        diffPatchPath: string;
        agentLogPath: string;
        fileSafety: FileSafetyResult | undefined;
      }
    | undefined;
  memoryUsed:
    | {
        projectMemoryFiles: number;
        decisionMemoryFiles: number;
        agentMemoryFiles: number;
      }
    | undefined;
  testRunResult:
    | {
        overallStatus: string;
        results: TestCommandResult[];
      }
    | undefined;
  fixLoopResult: FixLoopResult | undefined;
}

interface CodeGenResult {
  success: boolean;
  changedFiles: string[];
  diffPatchPath: string;
  agentLogPath: string;
  fileSafety: FileSafetyResult | undefined;
}

async function executeCodeGeneration(
  runId: string,
  paths: Awaited<ReturnType<typeof createArtifactDirs>>,
  implementationPrompt: string,
  selectedAgent: AiAdapterName,
  projectRoot: string | undefined,
  cliConfigs?: Record<string, { enabled: boolean; command: string; timeoutSeconds: number }>,
  safetyPolicy?: SafetyPolicy,
  timeoutOverride?: number,
): Promise<CodeGenResult> {
  const workingDir = projectRoot ?? process.cwd();

  await writeArtifact(paths.implementationPromptPath, implementationPrompt);

  const cliConfig = cliConfigs?.[selectedAgent];
  const command = cliConfig?.command ?? selectedAgent;
  const timeout =
    timeoutOverride ?? safetyPolicy?.commandTimeoutSeconds ?? cliConfig?.timeoutSeconds ?? 900;
  const agentLogPath = paths.agentLogPath;
  const diffPatchPath = paths.diffPatchPath;

  const execArgs: string[] = ["-p", implementationPrompt];
  const execCmd = `${command} ${execArgs.join(" ")}`;

  if (!checkCommandSafety(execCmd, safetyPolicy?.denyCommands ?? [])) {
    return { success: false, changedFiles: [], diffPatchPath, agentLogPath, fileSafety: undefined };
  }

  try {
    const { writeFile, mkdir } = await import("node:fs/promises");
    const { spawn } = await import("node:child_process");
    const logStream: string[] = [];
    logStream.push(`# Agent Execution Log\n`);
    logStream.push(`Agent: ${selectedAgent}\n`);
    logStream.push(`Command: ${execCmd}\n`);
    logStream.push(`Timeout: ${String(timeout)}s\n`);
    logStream.push(`Started: ${new Date().toISOString()}\n\n`);

    await mkdir(join(paths.implementationDir), { recursive: true });

    const exitCode = await new Promise<number | null>((resolve) => {
      const child = spawn(command, [`-p`, implementationPrompt], {
        cwd: workingDir,
        shell: true,
        timeout: timeout * 1000,
        stdio: ["ignore", "pipe", "pipe"],
      });

      child.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf-8");
        logStream.push(text);
      });

      child.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf-8");
        logStream.push(text);
      });

      child.on("close", (code: number | null) => {
        resolve(code);
      });

      child.on("error", () => {
        resolve(null);
      });
    });

    logStream.push(`\nFinished: ${new Date().toISOString()}\n`);
    logStream.push(`Exit code: ${String(exitCode ?? -1)}\n`);

    await writeFile(agentLogPath, logStream.join(""), "utf-8");

    const { getChangedFiles, generateDiff } = await import("@aiteam/adapters");
    const changedFiles = await getChangedFiles(workingDir);
    await generateDiff(workingDir, diffPatchPath);

    await writeFile(
      paths.changedFilesPath,
      JSON.stringify({ files: changedFiles, generatedAt: new Date().toISOString() }, null, 2),
      "utf-8",
    );

    let fileSafety: FileSafetyResult | undefined;
    if (safetyPolicy && changedFiles.length > 0) {
      fileSafety = checkFileSafety(changedFiles, safetyPolicy);
    }

    return {
      success: exitCode === 0,
      changedFiles,
      diffPatchPath,
      agentLogPath,
      fileSafety,
    };
  } catch {
    return { success: false, changedFiles: [], diffPatchPath, agentLogPath, fileSafety: undefined };
  }
}

export async function runSemiAutoWorkflow(
  input: SemiAutoWorkflowInput,
): Promise<SemiAutoWorkflowOutput> {
  const runId = createRunId(input.requirement);
  const createdAt = nowIso();
  const paths = await createArtifactDirs(runId);
  const artifacts: string[] = [];

  const templateDir = input.templateDir;

  const baTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("BA", input.agentMapping, input.cliConfigs)
      : undefined;

  const architectTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("ARCHITECT", input.agentMapping, input.cliConfigs)
      : undefined;

  const pmTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("PROJECT_MANAGER", input.agentMapping, input.cliConfigs)
      : undefined;

  const qaTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("QA", input.agentMapping, input.cliConfigs)
      : undefined;

  const codingPlanTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("CODING_PLANNER", input.agentMapping, input.cliConfigs)
      : undefined;

  const developerTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("DEVELOPER", input.agentMapping, input.cliConfigs)
      : undefined;

  const frontendPlannerTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("FRONTEND_PLANNER", input.agentMapping, input.cliConfigs)
      : undefined;

  const backendPlannerTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("BACKEND_PLANNER", input.agentMapping, input.cliConfigs)
      : undefined;

  const reporterTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("REPORTER", input.agentMapping, input.cliConfigs)
      : undefined;

  const traceabilityTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("TRACEABILITY", input.agentMapping, input.cliConfigs)
      : undefined;

  const integrationPlannerTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs && (input.generateIntegrationPlan ?? false)
      ? getAiToolConfig("INTEGRATION_PLANNER", input.agentMapping, input.cliConfigs)
      : undefined;

  const devopsReleaseTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs && (input.generateReleasePlan ?? false)
      ? getAiToolConfig("DEVOPS_RELEASE", input.agentMapping, input.cliConfigs)
      : undefined;

  const techDocTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs && (input.generateDocumentation ?? false)
      ? getAiToolConfig("TECHNICAL_DOC", input.agentMapping, input.cliConfigs)
      : undefined;

  await writeArtifact(paths.inputFile, `# Raw Requirement\n\n${input.requirement}\n`);
  artifacts.push(paths.inputFile);

  const repoAnalysis = input.projectRoot ? await analyzeRepository(input.projectRoot) : undefined;

  if (repoAnalysis) {
    const analysisContent = analysisToMarkdown(repoAnalysis);
    await writeArtifact(join(paths.designDir, "repository-analysis.md"), analysisContent);
    artifacts.push(join(paths.designDir, "repository-analysis.md"));
  }

  const baOutput = await runBaAgent(
    { requirement: input.requirement },
    { templateDir, aiTool: baTool },
  );

  await writeArtifact(
    join(paths.requirementDir, "clarified-requirement.md"),
    baOutput.clarifiedRequirement,
  );
  artifacts.push(join(paths.requirementDir, "clarified-requirement.md"));

  await writeArtifact(join(paths.requirementDir, "business-rules.md"), baOutput.businessRules);
  artifacts.push(join(paths.requirementDir, "business-rules.md"));

  await writeArtifact(
    join(paths.requirementDir, "acceptance-criteria.md"),
    baOutput.acceptanceCriteria,
  );
  artifacts.push(join(paths.requirementDir, "acceptance-criteria.md"));

  await writeArtifact(join(paths.requirementDir, "open-questions.md"), baOutput.openQuestions);
  artifacts.push(join(paths.requirementDir, "open-questions.md"));

  await writeArtifact(join(paths.requirementDir, "assumptions.md"), baOutput.assumptions);
  artifacts.push(join(paths.requirementDir, "assumptions.md"));

  const architectInput: Parameters<typeof runArchitectAgent>[0] = {
    requirement: input.requirement,
    clarifiedRequirement: baOutput.clarifiedRequirement,
    ...(repoAnalysis ? { repositoryAnalysis: repoAnalysis } : {}),
  };

  const architectOutput = await runArchitectAgent(architectInput, {
    templateDir,
    aiTool: architectTool,
  });

  await writeArtifact(
    join(paths.designDir, "technical-design.md"),
    architectOutput.technicalDesign,
  );
  artifacts.push(join(paths.designDir, "technical-design.md"));

  await writeArtifact(join(paths.designDir, "api-design.md"), architectOutput.apiDesign);
  artifacts.push(join(paths.designDir, "api-design.md"));

  await writeArtifact(join(paths.designDir, "db-design.md"), architectOutput.dbDesign);
  artifacts.push(join(paths.designDir, "db-design.md"));

  let integrationPlanOutput: Awaited<ReturnType<typeof runIntegrationPlannerAgent>> | undefined;

  if (input.generateIntegrationPlan ?? false) {
    integrationPlanOutput = await runIntegrationPlannerAgent(
      {
        requirement: input.requirement,
        clarifiedRequirement: baOutput.clarifiedRequirement,
        apiDesign: architectOutput.apiDesign,
        technicalDesign: architectOutput.technicalDesign,
      },
      { templateDir, aiTool: integrationPlannerTool },
    );

    await writeArtifact(paths.integrationPlanPath, integrationPlanOutput.integrationPlan);
    artifacts.push(paths.integrationPlanPath);
  }

  const plannerSelection = resolvePlannerSelection(
    input.plannerSelection,
    repoAnalysis?.projectType,
  );

  let frontendPlannerOutput: Awaited<ReturnType<typeof runFrontendPlannerAgent>> | undefined;
  let backendPlannerOutput: Awaited<ReturnType<typeof runBackendPlannerAgent>> | undefined;

  if (plannerSelection.runFrontend) {
    frontendPlannerOutput = await runFrontendPlannerAgent(
      {
        requirement: input.requirement,
        clarifiedRequirement: baOutput.clarifiedRequirement,
        ...(repoAnalysis ? { repositoryAnalysis: repoAnalysis } : {}),
      },
      { templateDir, aiTool: frontendPlannerTool },
    );

    await writeArtifact(
      paths.frontendDesignPath,
      [
        "## Component Tree\n",
        frontendPlannerOutput.componentTree,
        "\n\n## State Management\n",
        frontendPlannerOutput.stateManagement,
        "\n\n## Routing Design\n",
        frontendPlannerOutput.routingDesign,
        "\n\n## Data Fetching Strategy\n",
        frontendPlannerOutput.dataFetchingStrategy,
      ].join("\n"),
    );
    artifacts.push(paths.frontendDesignPath);
  }

  if (plannerSelection.runBackend) {
    backendPlannerOutput = await runBackendPlannerAgent(
      {
        requirement: input.requirement,
        clarifiedRequirement: baOutput.clarifiedRequirement,
        ...(repoAnalysis ? { repositoryAnalysis: repoAnalysis } : {}),
      },
      { templateDir, aiTool: backendPlannerTool },
    );

    await writeArtifact(
      paths.backendDesignPath,
      [
        "## Service Layer\n",
        backendPlannerOutput.serviceLayer,
        "\n\n## Controller Design\n",
        backendPlannerOutput.controllerDesign,
        "\n\n## Middleware Chain\n",
        backendPlannerOutput.middlewareChain,
        "\n\n## Error Handling Strategy\n",
        backendPlannerOutput.errorHandlingStrategy,
      ].join("\n"),
    );
    artifacts.push(paths.backendDesignPath);
  }

  const combinedDesign = [
    architectOutput.technicalDesign,
    ...(frontendPlannerOutput
      ? [
          "\n\n# Frontend Design\n\n## Component Tree\n",
          frontendPlannerOutput.componentTree,
          "\n\n## State Management\n",
          frontendPlannerOutput.stateManagement,
          "\n\n## Routing Design\n",
          frontendPlannerOutput.routingDesign,
          "\n\n## Data Fetching Strategy\n",
          frontendPlannerOutput.dataFetchingStrategy,
        ]
      : []),
    ...(backendPlannerOutput
      ? [
          "\n\n# Backend Design\n\n## Service Layer\n",
          backendPlannerOutput.serviceLayer,
          "\n\n## Controller Design\n",
          backendPlannerOutput.controllerDesign,
          "\n\n## Middleware Chain\n",
          backendPlannerOutput.middlewareChain,
          "\n\n## Error Handling Strategy\n",
          backendPlannerOutput.errorHandlingStrategy,
        ]
      : []),
  ].join("");

  const pmOutput = await runPmAgent(
    {
      requirement: input.requirement,
      technicalDesign: combinedDesign,
    },
    { templateDir, aiTool: pmTool },
  );

  await writeArtifact(join(paths.tasksDir, "task-breakdown.md"), pmOutput.taskBreakdownMd);
  artifacts.push(join(paths.tasksDir, "task-breakdown.md"));

  await writeArtifact(join(paths.tasksDir, "task-breakdown.json"), pmOutput.taskBreakdownJson);
  artifacts.push(join(paths.tasksDir, "task-breakdown.json"));

  const qaOutput = await runQaAgent(
    {
      requirement: input.requirement,
      acceptanceCriteria: baOutput.acceptanceCriteria,
      taskBreakdownJson: pmOutput.taskBreakdownJson,
    },
    { templateDir, aiTool: qaTool },
  );

  await writeArtifact(join(paths.testsDir, "test-matrix.md"), qaOutput.testMatrixMd);
  artifacts.push(join(paths.testsDir, "test-matrix.md"));

  await writeArtifact(join(paths.testsDir, "test-matrix.json"), qaOutput.testMatrixJson);
  artifacts.push(join(paths.testsDir, "test-matrix.json"));

  const codingPlanOutput = await runCodingPlanAgent(
    {
      requirement: input.requirement,
      clarifiedRequirement: baOutput.clarifiedRequirement,
      businessRules: baOutput.businessRules,
      acceptanceCriteria: baOutput.acceptanceCriteria,
      technicalDesign: combinedDesign,
      apiDesign: architectOutput.apiDesign,
      dbDesign: architectOutput.dbDesign,
      taskBreakdownMd: pmOutput.taskBreakdownMd,
      testMatrixMd: qaOutput.testMatrixMd,
    },
    { templateDir, aiTool: codingPlanTool },
  );

  await writeArtifact(paths.codingPlanPath, codingPlanOutput.codingPlanMd);
  artifacts.push(paths.codingPlanPath);

  const developerOutput = await runDeveloperAgent(
    {
      requirement: input.requirement,
      clarifiedRequirement: baOutput.clarifiedRequirement,
      businessRules: baOutput.businessRules,
      acceptanceCriteria: baOutput.acceptanceCriteria,
      technicalDesign: combinedDesign,
      apiDesign: architectOutput.apiDesign,
      dbDesign: architectOutput.dbDesign,
      taskBreakdownMd: pmOutput.taskBreakdownMd,
      testMatrixMd: qaOutput.testMatrixMd,
      codingPlanMd: codingPlanOutput.codingPlanMd,
    },
    { templateDir, aiTool: developerTool },
  );

  await writeArtifact(paths.implementationPromptPath, developerOutput.implementationPrompt);
  artifacts.push(paths.implementationPromptPath);

  const requireApproval = input.approvalConfig?.requireCodeApproval ?? true;

  if (requireApproval) {
    return {
      runId,
      status: "WAITING_FOR_CODE_APPROVAL",
      artifacts,
      createdAt,
      completedAt: nowIso(),
      codeGenerationResult: undefined,
      pendingGate: {
        gate: "CODE_GENERATION",
        status: "PENDING",
        summary: `Review and approve code generation. Agent: ${input.selectedAgent}`,
        artifacts: [paths.codingPlanPath, paths.implementationPromptPath],
      },
      memoryUsed: input.memoryContext
        ? {
            projectMemoryFiles: input.memoryContext.projectMemoryCount,
            decisionMemoryFiles: input.memoryContext.decisionMemoryCount,
            agentMemoryFiles: input.memoryContext.agentMemoryCount,
          }
        : undefined,
      testRunResult: undefined,
      fixLoopResult: undefined,
    };
  }

  const codeResult = await executeCodeGeneration(
    runId,
    paths,
    developerOutput.implementationPrompt,
    input.selectedAgent,
    input.projectRoot,
    input.cliConfigs,
    input.safetyPolicy,
    input.commandTimeoutSeconds,
  );

  artifacts.push(paths.agentLogPath);
  artifacts.push(paths.diffPatchPath);
  artifacts.push(paths.changedFilesPath);

  if (
    codeResult.fileSafety &&
    (codeResult.fileSafety.blocked.length > 0 || codeResult.fileSafety.warnings.length > 0)
  ) {
    const blockedCount = codeResult.fileSafety.blocked.length;
    const warnCount = codeResult.fileSafety.warnings.length;
    const parts: string[] = [];
    if (blockedCount > 0) parts.push(`${String(blockedCount)} blocked`);
    if (warnCount > 0) parts.push(`${String(warnCount)} warning`);
    return {
      runId,
      status: "WAITING_FOR_RISKY_FILE_APPROVAL",
      artifacts,
      createdAt,
      completedAt: nowIso(),
      codeGenerationResult: codeResult,
      pendingGate: {
        gate: "RISKY_FILE",
        status: "PENDING",
        summary: `Code modified ${parts.join(" and ")} file(s). Review before continuing.`,
        artifacts: [paths.changedFilesPath, paths.diffPatchPath],
      },
      memoryUsed: input.memoryContext
        ? {
            projectMemoryFiles: input.memoryContext.projectMemoryCount,
            decisionMemoryFiles: input.memoryContext.decisionMemoryCount,
            agentMemoryFiles: input.memoryContext.agentMemoryCount,
          }
        : undefined,
      testRunResult: undefined,
      fixLoopResult: undefined,
    };
  }

  const devTool = developerTool;
  return runPostCodePipeline({
    runId,
    paths,
    codeResult,
    input,
    clarifiedRequirement: baOutput.clarifiedRequirement,
    businessRules: baOutput.businessRules,
    acceptanceCriteria: baOutput.acceptanceCriteria,
    technicalDesign: combinedDesign,
    apiDesign: architectOutput.apiDesign,
    dbDesign: architectOutput.dbDesign,
    taskBreakdownMd: pmOutput.taskBreakdownMd,
    testMatrixMd: qaOutput.testMatrixMd,
    implementationPrompt: developerOutput.implementationPrompt,
    codingPlanMd: codingPlanOutput.codingPlanMd,
    devTool: devTool
      ? { tool: devTool.tool, command: devTool.command, timeoutSeconds: devTool.timeoutSeconds }
      : undefined,
    reporterTool,
    devopsReleaseTool,
    traceabilityTool,
    integrationPlanOutput,
    templateDir,
    techDocTool,
  });
}

interface PostCodeContext {
  runId: string;
  paths: ArtifactPaths;
  codeResult: CodeGenResult;
  input: SemiAutoWorkflowInput;
  clarifiedRequirement: string;
  businessRules: string;
  acceptanceCriteria: string;
  technicalDesign: string;
  apiDesign: string;
  dbDesign: string;
  taskBreakdownMd: string;
  testMatrixMd: string;
  codingPlanMd: string;
  implementationPrompt: string;
  devTool: AiToolConfig | undefined;
  reporterTool: AiToolConfig | undefined;
  devopsReleaseTool: AiToolConfig | undefined;
  traceabilityTool: AiToolConfig | undefined;
  integrationPlanOutput: Awaited<ReturnType<typeof runIntegrationPlannerAgent>> | undefined;
  templateDir: string | undefined;
  techDocTool: AiToolConfig | undefined;
}

async function runPostCodePipeline(ctx: PostCodeContext): Promise<SemiAutoWorkflowOutput> {
  const {
    runId,
    paths,
    codeResult,
    input,
    clarifiedRequirement,
    businessRules,
    acceptanceCriteria,
    technicalDesign,
    apiDesign,
    dbDesign,
    taskBreakdownMd,
    testMatrixMd,
    implementationPrompt,
    devTool,
    reporterTool,
    traceabilityTool,
    templateDir,
    techDocTool,
  } = ctx;
  const artifacts: string[] = [];
  artifacts.push(paths.agentLogPath);
  artifacts.push(paths.diffPatchPath);
  artifacts.push(paths.changedFilesPath);

  let testRunResult: SemiAutoWorkflowOutput["testRunResult"];
  let finalStatus = codeResult.success ? "CODE_GENERATED" : "CODE_FAILED";

  if (codeResult.success && !input.skipTests && input.testCommands) {
    const cmds: { name: string; command: string }[] = [];
    if (input.testCommands.build) cmds.push({ name: "build", command: input.testCommands.build });
    if (input.testCommands.unitTest)
      cmds.push({ name: "unitTest", command: input.testCommands.unitTest });
    if (input.testCommands.integrationTest)
      cmds.push({ name: "integrationTest", command: input.testCommands.integrationTest });
    if (input.testCommands.lint) cmds.push({ name: "lint", command: input.testCommands.lint });

    if (cmds.length > 0) {
      const { runTests, writeTestResultArtifacts } = await import("@aiteam/adapters");
      const timeout = input.commandTimeoutSeconds ?? 300;
      const logDir = join(paths.runDir, "tests");

      const testRun = await runTests(
        cmds.map((c) => ({
          name: c.name,
          command: c.command,
          cwd: input.projectRoot ?? process.cwd(),
          timeoutSeconds: timeout,
        })),
        logDir,
      );

      const { testResultPath, failedTestsPath } = await writeTestResultArtifacts(
        testRun,
        join(paths.runDir, "tests"),
      );
      artifacts.push(testResultPath);
      artifacts.push(failedTestsPath);

      testRunResult = {
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
      };
      finalStatus = testRun.overallStatus === "PASSED" ? "TEST_PASSED" : "TEST_FAILED";
    }
  }

  let fixLoopResult: FixLoopResult | undefined;

  if (codeResult.success && input.testCommands) {
    const reviewResult = await loadAndReview(runId);
    const persisted = await persistReview(runId, reviewResult);
    artifacts.push(persisted.reviewReportPath);
    artifacts.push(persisted.securityReviewPath);
    artifacts.push(persisted.requirementCoveragePath);

    if (reviewResult.overallStatus === "CHANGES_REQUIRED") {
      if (input.noFixLoop) {
        finalStatus = "REVIEW_FAILED";
      } else {
        const cmds: { name: string; command: string; cwd: string; timeoutSeconds: number }[] = [];
        const timeout = input.commandTimeoutSeconds ?? 300;
        if (input.testCommands.build)
          cmds.push({
            name: "build",
            command: input.testCommands.build,
            cwd: input.projectRoot ?? process.cwd(),
            timeoutSeconds: timeout,
          });
        if (input.testCommands.unitTest)
          cmds.push({
            name: "unitTest",
            command: input.testCommands.unitTest,
            cwd: input.projectRoot ?? process.cwd(),
            timeoutSeconds: timeout,
          });
        if (input.testCommands.integrationTest)
          cmds.push({
            name: "integrationTest",
            command: input.testCommands.integrationTest,
            cwd: input.projectRoot ?? process.cwd(),
            timeoutSeconds: timeout,
          });
        if (input.testCommands.lint)
          cmds.push({
            name: "lint",
            command: input.testCommands.lint,
            cwd: input.projectRoot ?? process.cwd(),
            timeoutSeconds: timeout,
          });

        const aiTool = devTool
          ? { tool: devTool.tool, command: devTool.command, timeoutSeconds: devTool.timeoutSeconds }
          : { tool: "claude", command: "claude", timeoutSeconds: 900 };

        fixLoopResult = await runFixLoop(runId, implementationPrompt, {
          maxIterations: input.maxIterations ?? 3,
          testCommands: cmds,
          aiTool,
        });

        const lastIteration = fixLoopResult.iterations[fixLoopResult.iterations.length - 1];
        if (lastIteration) {
          testRunResult = {
            overallStatus: lastIteration.testResult.overallStatus,
            results: lastIteration.testResult.results.map((r) => ({
              name: r.commandName,
              command: r.command,
              exitCode: r.exitCode,
              status: r.timedOut ? "TIMEOUT" : r.passed ? "PASSED" : "FAILED",
              durationMs: r.durationMs,
              stdoutPath: r.stdoutPath,
              stderrPath: r.stderrPath,
            })),
          };
        }

        if (fixLoopResult.finalStatus === "PASSED") {
          finalStatus = "REVIEW_PASSED";
        } else {
          finalStatus = "REVIEW_FAILED";
        }
      }
    } else {
      finalStatus = finalStatus === "TEST_PASSED" ? "REVIEW_PASSED" : finalStatus;
    }
  }

  let devopsReleaseOutput: Awaited<ReturnType<typeof runDevopsReleaseAgent>> | undefined;

  if (ctx.input.generateReleasePlan ?? false) {
    devopsReleaseOutput = await runDevopsReleaseAgent(
      {
        requirement: ctx.input.requirement,
        clarifiedRequirement,
        technicalDesign,
        apiDesign,
        taskBreakdownMd,
      },
      { templateDir, aiTool: ctx.devopsReleaseTool },
    );

    await writeArtifact(paths.releasePlanPath, devopsReleaseOutput.releasePlan);
    artifacts.push(paths.releasePlanPath);

    await writeArtifact(paths.changelogPath, devopsReleaseOutput.changelog);
    artifacts.push(paths.changelogPath);
  }

  const traceabilityOutput = await runTraceabilityAgent(
    { runId, artifactPaths: paths, changedFilesPath: paths.changedFilesPath },
    { templateDir, aiTool: traceabilityTool },
  );

  const traceabilityMd = traceabilityToEnhancedMarkdown(traceabilityOutput);
  await writeArtifact(paths.traceabilityMd, traceabilityMd);
  artifacts.push(paths.traceabilityMd);
  await writeArtifact(paths.traceabilityJson, JSON.stringify(traceabilityOutput.matrix, null, 2));
  artifacts.push(paths.traceabilityJson);

  const traceabilitySection = traceabilityMd;

  if (input.generateDocumentation ?? false) {
    const techDocOutput = await runTechnicalDocumentationAgent(
      {
        requirement: input.requirement,
        clarifiedRequirement,
        acceptanceCriteria,
        technicalDesign,
        apiDesign,
        dbDesign,
        taskBreakdownMd,
        testMatrixMd,
        traceabilitySection,
        integrationPlanSection: ctx.integrationPlanOutput?.integrationPlan,
        releasePlanSection: devopsReleaseOutput?.releasePlan,
      },
      { templateDir, aiTool: techDocTool },
    );

    await writeArtifact(paths.apiReferencePath, techDocOutput.apiReference);
    artifacts.push(paths.apiReferencePath);

    await writeArtifact(paths.setupGuidePath, techDocOutput.setupGuide);
    artifacts.push(paths.setupGuidePath);

    await writeArtifact(paths.technicalReferencePath, techDocOutput.technicalReference);
    artifacts.push(paths.technicalReferencePath);

    await writeArtifact(paths.operationsGuidePath, techDocOutput.operationsGuide);
    artifacts.push(paths.operationsGuidePath);
  }

  const reporterOutput = await runReporterAgent(
    {
      requirement: input.requirement,
      clarifiedRequirement,
      businessRules,
      acceptanceCriteria,
      technicalDesign,
      apiDesign,
      dbDesign,
      taskBreakdownMd,
      testMatrixMd,
      traceabilitySection,
      integrationPlanSection: ctx.integrationPlanOutput?.integrationPlan,
      releasePlanSection: devopsReleaseOutput?.releasePlan,
      changelogSection: devopsReleaseOutput?.changelog,
    },
    { templateDir, aiTool: reporterTool },
  );

  await writeArtifact(join(paths.reportDir, "final-report.md"), reporterOutput.finalReport);
  artifacts.push(join(paths.reportDir, "final-report.md"));

  const memoryUsed = input.memoryContext
    ? {
        projectMemoryFiles: input.memoryContext.projectMemoryCount,
        decisionMemoryFiles: input.memoryContext.decisionMemoryCount,
        agentMemoryFiles: input.memoryContext.agentMemoryCount,
      }
    : undefined;

  if (finalStatus === "CODE_GENERATED" && !testRunResult) {
    finalStatus = "REPORT_GENERATED";
  }

  if (input.slackConfig?.enabled && input.slackConfig.notifyOn.includes("report_ready")) {
    const slackInput: SlackMessageInput = {
      runTitle: input.requirement,
      runId,
      status: finalStatus,
    };
    const slackText = buildReportReadyMessage(slackInput);
    try {
      const { notifySlack } = await import("@aiteam/adapters");
      await notifySlack(input.slackConfig, "report_ready", slackText, true);
    } catch {
      // Slack notification is optional
    }
  }

  return {
    runId,
    status: finalStatus,
    artifacts,
    createdAt: nowIso(),
    completedAt: nowIso(),
    codeGenerationResult: codeResult,
    memoryUsed,
    testRunResult,
    fixLoopResult,
  };
}

export async function continueAfterRiskyFileApproval(
  input: SemiAutoWorkflowInput & { runId: string },
): Promise<SemiAutoWorkflowOutput> {
  const paths = await createArtifactDirs(input.runId);
  const { readFile: rf } = await import("node:fs/promises");

  const implementationPrompt = await rf(paths.implementationPromptPath, "utf-8").catch(() => "");

  let changedFiles: string[] = [];
  try {
    const raw = await rf(paths.changedFilesPath, "utf-8");
    const parsed = JSON.parse(raw) as { files?: string[] };
    changedFiles = parsed.files ?? [];
  } catch {
    changedFiles = [];
  }

  const codeResult: CodeGenResult = {
    success: changedFiles.length > 0,
    changedFiles,
    diffPatchPath: paths.diffPatchPath,
    agentLogPath: paths.agentLogPath,
    fileSafety: undefined,
  };

  const clarifiedRequirement = await rf(
    join(paths.requirementDir, "clarified-requirement.md"),
    "utf-8",
  ).catch(() => "");
  const businessRules = await rf(join(paths.requirementDir, "business-rules.md"), "utf-8").catch(
    () => "",
  );
  const acceptanceCriteria = await rf(
    join(paths.requirementDir, "acceptance-criteria.md"),
    "utf-8",
  ).catch(() => "");
  const technicalDesign = await rf(join(paths.designDir, "technical-design.md"), "utf-8").catch(
    () => "",
  );
  const apiDesign = await rf(join(paths.designDir, "api-design.md"), "utf-8").catch(() => "");
  const dbDesign = await rf(join(paths.designDir, "db-design.md"), "utf-8").catch(() => "");
  const taskBreakdownMd = await rf(join(paths.tasksDir, "task-breakdown.md"), "utf-8").catch(
    () => "",
  );
  const testMatrixMd = await rf(join(paths.testsDir, "test-matrix.md"), "utf-8").catch(() => "");
  const codingPlanMd = await rf(paths.codingPlanPath, "utf-8").catch(() => "");

  return runPostCodePipeline({
    runId: input.runId,
    paths,
    codeResult,
    input,
    clarifiedRequirement,
    businessRules,
    acceptanceCriteria,
    technicalDesign,
    apiDesign,
    dbDesign,
    taskBreakdownMd,
    testMatrixMd,
    implementationPrompt,
    codingPlanMd,
    devTool:
      input.agentMapping && input.cliConfigs
        ? getAiToolConfig("DEVELOPER", input.agentMapping, input.cliConfigs)
        : undefined,
    reporterTool:
      input.agentMapping && input.cliConfigs
        ? getAiToolConfig("REPORTER", input.agentMapping, input.cliConfigs)
        : undefined,
    devopsReleaseTool:
      input.agentMapping && input.cliConfigs && (input.generateReleasePlan ?? false)
        ? getAiToolConfig("DEVOPS_RELEASE", input.agentMapping, input.cliConfigs)
        : undefined,
    traceabilityTool:
      input.agentMapping && input.cliConfigs
        ? getAiToolConfig("TRACEABILITY", input.agentMapping, input.cliConfigs)
        : undefined,
    integrationPlanOutput: undefined,
    templateDir: input.templateDir,
    techDocTool:
      input.agentMapping && input.cliConfigs && (input.generateDocumentation ?? false)
        ? getAiToolConfig("TECHNICAL_DOC", input.agentMapping, input.cliConfigs)
        : undefined,
  });
}

export async function continueSemiAutoWorkflow(
  input: SemiAutoWorkflowInput & { runId: string },
): Promise<SemiAutoWorkflowOutput> {
  const paths = await createArtifactDirs(input.runId);
  const { readFile } = await import("node:fs/promises");
  const implementationPrompt = await readFile(paths.implementationPromptPath, "utf-8").catch(
    () => "",
  );

  const codeResult = await executeCodeGeneration(
    input.runId,
    paths,
    implementationPrompt,
    input.selectedAgent,
    input.projectRoot,
    input.cliConfigs,
    input.safetyPolicy,
    input.commandTimeoutSeconds,
  );

  const artifacts: string[] = [];
  artifacts.push(paths.agentLogPath);
  artifacts.push(paths.diffPatchPath);
  artifacts.push(paths.changedFilesPath);

  const memoryUsed = input.memoryContext
    ? {
        projectMemoryFiles: input.memoryContext.projectMemoryCount,
        decisionMemoryFiles: input.memoryContext.decisionMemoryCount,
        agentMemoryFiles: input.memoryContext.agentMemoryCount,
      }
    : undefined;

  if (
    codeResult.fileSafety &&
    (codeResult.fileSafety.blocked.length > 0 || codeResult.fileSafety.warnings.length > 0)
  ) {
    const blockedCount = codeResult.fileSafety.blocked.length;
    const warnCount = codeResult.fileSafety.warnings.length;
    const parts: string[] = [];
    if (blockedCount > 0) parts.push(`${String(blockedCount)} blocked`);
    if (warnCount > 0) parts.push(`${String(warnCount)} warning`);
    return {
      runId: input.runId,
      status: "WAITING_FOR_RISKY_FILE_APPROVAL",
      artifacts,
      createdAt: nowIso(),
      completedAt: nowIso(),
      codeGenerationResult: codeResult,
      pendingGate: {
        gate: "RISKY_FILE",
        status: "PENDING",
        summary: `Code modified ${parts.join(" and ")} file(s). Review before continuing.`,
        artifacts: [paths.changedFilesPath, paths.diffPatchPath],
      },
      memoryUsed,
      testRunResult: undefined,
      fixLoopResult: undefined,
    };
  }

  return {
    runId: input.runId,
    status: codeResult.success ? "CODE_GENERATED" : "CODE_FAILED",
    artifacts,
    createdAt: nowIso(),
    completedAt: nowIso(),
    codeGenerationResult: codeResult,
    memoryUsed,
    testRunResult: undefined,
    fixLoopResult: undefined,
  };
}
