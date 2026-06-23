import { join } from "node:path";
import { createRunId, nowIso } from "@aiteam/shared";
import type { ApprovalGate, AiAdapterName } from "@aiteam/shared";
import { createArtifactDirs, writeArtifact } from "../artifacts/artifactWriter.js";
import { runBaAgent } from "../agents/baAgent.js";
import { runArchitectAgent } from "../agents/architectAgent.js";
import { runPmAgent } from "../agents/pmAgent.js";
import { runQaAgent } from "../agents/qaAgent.js";
import { runDeveloperAgent } from "../agents/developerAgent.js";
import { runReporterAgent } from "../agents/reporterAgent.js";
import { analyzeRepository, analysisToMarkdown } from "../repoAnalyzer/repoAnalyzer.js";
import { getAiToolConfig } from "./workflowHelpers.js";
import type { AiToolConfig } from "./workflowHelpers.js";
import {
  generateTraceability,
  traceabilityToMarkdown,
} from "../traceability/traceabilityEngine.js";
import { checkFileSafety, checkCommandSafety } from "../policies/safetyPolicy.js";
import type { SafetyPolicy, FileSafetyResult } from "../policies/safetyPolicy.js";

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

  const developerTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("DEVELOPER", input.agentMapping, input.cliConfigs)
      : undefined;

  const reporterTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("REPORTER", input.agentMapping, input.cliConfigs)
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

  const pmOutput = await runPmAgent(
    {
      requirement: input.requirement,
      technicalDesign: architectOutput.technicalDesign,
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

  const developerOutput = await runDeveloperAgent(
    {
      requirement: input.requirement,
      clarifiedRequirement: baOutput.clarifiedRequirement,
      businessRules: baOutput.businessRules,
      acceptanceCriteria: baOutput.acceptanceCriteria,
      technicalDesign: architectOutput.technicalDesign,
      apiDesign: architectOutput.apiDesign,
      dbDesign: architectOutput.dbDesign,
      taskBreakdownMd: pmOutput.taskBreakdownMd,
      testMatrixMd: qaOutput.testMatrixMd,
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
        artifacts: [paths.implementationPromptPath],
      },
      memoryUsed: input.memoryContext
        ? {
            projectMemoryFiles: input.memoryContext.projectMemoryCount,
            decisionMemoryFiles: input.memoryContext.decisionMemoryCount,
            agentMemoryFiles: input.memoryContext.agentMemoryCount,
          }
        : undefined,
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

  const traceability = await generateTraceability(runId, paths);
  await writeArtifact(paths.traceabilityMd, traceabilityToMarkdown(traceability));
  artifacts.push(paths.traceabilityMd);

  await writeArtifact(paths.traceabilityJson, JSON.stringify(traceability, null, 2));
  artifacts.push(paths.traceabilityJson);

  const traceabilitySection = traceabilityToMarkdown(traceability);

  const reporterOutput = await runReporterAgent(
    {
      requirement: input.requirement,
      clarifiedRequirement: baOutput.clarifiedRequirement,
      businessRules: baOutput.businessRules,
      acceptanceCriteria: baOutput.acceptanceCriteria,
      technicalDesign: architectOutput.technicalDesign,
      apiDesign: architectOutput.apiDesign,
      dbDesign: architectOutput.dbDesign,
      taskBreakdownMd: pmOutput.taskBreakdownMd,
      testMatrixMd: qaOutput.testMatrixMd,
      traceabilitySection,
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

  const completedStatus = codeResult.success ? "REPORT_GENERATED" : "CODE_FAILED";

  return {
    runId,
    status: completedStatus,
    artifacts,
    createdAt,
    completedAt: nowIso(),
    codeGenerationResult: codeResult,
    memoryUsed,
  };
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

  return {
    runId: input.runId,
    status: codeResult.success ? "CODE_GENERATED" : "CODE_FAILED",
    artifacts,
    createdAt: nowIso(),
    completedAt: nowIso(),
    codeGenerationResult: codeResult,
    memoryUsed,
  };
}
