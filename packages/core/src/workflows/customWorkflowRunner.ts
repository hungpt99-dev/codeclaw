import { join } from "node:path";
import { createRunId, nowIso } from "@codeclaw/shared";
import type {
  WorkflowTemplate,
  WorkflowStepKind,
  SlackIntegrationConfig,
  AgentBackendConfig,
} from "@codeclaw/shared";
import { createArtifactDirs, writeArtifact } from "../artifacts/artifactWriter.js";
import type { ArtifactPaths } from "../artifacts/artifactWriter.js";
import { runBaAgent } from "../agents/baAgent.js";
import { type runPoAgent } from "../agents/poAgent.js";
import { runArchitectAgent } from "../agents/architectAgent.js";
import { runFrontendPlannerAgent } from "../agents/frontendPlannerAgent.js";
import { runBackendPlannerAgent } from "../agents/backendPlannerAgent.js";
import { runDevopsReleaseAgent } from "../agents/devopsReleaseAgent.js";
import { runPmAgent } from "../agents/pmAgent.js";
import { runQaAgent } from "../agents/qaAgent.js";
import { runUserJourneyAgent } from "../agents/userJourneyAgent.js";
import { runUiDesignerAgent } from "../agents/uiDesignerAgent.js";
import { runUxWriterAgent } from "../agents/uxWriterAgent.js";
import { runReporterAgent } from "../agents/reporterAgent.js";

import {
  runTraceabilityAgent,
  traceabilityToEnhancedMarkdown,
} from "../agents/traceabilityAgent.js";
import { analyzeRepository, analysisToMarkdown } from "../repoAnalyzer/repoAnalyzer.js";
import { getAiToolConfig } from "./workflowHelpers.js";
import type { PlannerSelection } from "./workflowHelpers.js";
import { emitWorkflowProgress } from "./workflowEmitter.js";
import type { StepExecutionRepo } from "./stepExecutionService.js";
import { runDeveloperAgent } from "../agents/developerAgent.js";
import { runCodingPlanAgent } from "../agents/codingPlanAgent.js";
import { runCodeReviewerAgent } from "../agents/codeReviewerAgent.js";
import { runWithAgentBackend } from "../agents/agentBackendRunner.js";

export interface CustomWorkflowInput {
  requirement: string;
  projectRoot: string | undefined;
  memoryContext:
    | {
        projectMemoryCount: number;
        decisionMemoryCount: number;
        agentMemoryCount: number;
      }
    | undefined;
  template: WorkflowTemplate;
  templateDir?: string;
  agentMapping?: Record<string, string>;
  cliConfigs?: Record<string, { enabled: boolean; command: string; timeoutSeconds: number }>;
  agentBackendConfig?: AgentBackendConfig;
  slackConfig?: SlackIntegrationConfig;
  targetAgent?: "claude-code" | "codex" | "gemini" | "aider" | "generic";
  plannerSelection?: PlannerSelection;
  generateIntegrationPlan?: boolean;
  generateReleasePlan?: boolean;
  stepRepo?: StepExecutionRepo;
  dataDir?: string;
}

export interface CustomWorkflowOutput {
  runId: string;
  status: string;
  artifacts: string[];
  createdAt: string;
  completedAt: string;
  memoryUsed:
    | {
        projectMemoryFiles: number;
        decisionMemoryFiles: number;
        agentMemoryFiles: number;
      }
    | undefined;
  error?: string;
}

export async function runCustomWorkflow(input: CustomWorkflowInput): Promise<CustomWorkflowOutput> {
  const runId = createRunId(input.requirement);
  const createdAt = nowIso();
  const paths = await createArtifactDirs(runId, input.dataDir);
  const artifacts: string[] = [];
  const template = input.template;
  const templateDir = input.templateDir;

  const enabledSteps = template.steps.filter((s) => s.enabled).sort((a, b) => a.order - b.order);

  const stageNames = enabledSteps.map((s) => s.name);

  emitWorkflowProgress(runId, "WORKFLOW_STARTED", {
    stage: "Workflow Started",
    message: `Workflow started with template: ${template.name}`,
    stages: stageNames,
  });

  await writeArtifact(paths.inputFile, `# Raw Requirement\n\n${input.requirement}\n`);
  artifacts.push(paths.inputFile);

  const repoAnalysis = input.projectRoot ? await analyzeRepository(input.projectRoot) : undefined;

  if (repoAnalysis) {
    const analysisContent = analysisToMarkdown(repoAnalysis);
    await writeArtifact(join(paths.designDir, "repository-analysis.md"), analysisContent);
    artifacts.push(join(paths.designDir, "repository-analysis.md"));
  }

  let baOutput: Awaited<ReturnType<typeof runBaAgent>> | undefined;
  let poOutput: Awaited<ReturnType<typeof runPoAgent>> | undefined;
  let architectOutput: Awaited<ReturnType<typeof runArchitectAgent>> | undefined;
  let frontendPlannerOutput: Awaited<ReturnType<typeof runFrontendPlannerAgent>> | undefined;
  let backendPlannerOutput: Awaited<ReturnType<typeof runBackendPlannerAgent>> | undefined;
  let pmOutput: Awaited<ReturnType<typeof runPmAgent>> | undefined;
  let qaOutput: Awaited<ReturnType<typeof runQaAgent>> | undefined;
  let userJourneyOutput: Awaited<ReturnType<typeof runUserJourneyAgent>> | undefined;
  let uiDesignerOutput: Awaited<ReturnType<typeof runUiDesignerAgent>> | undefined;
  let uxWriterOutput: Awaited<ReturnType<typeof runUxWriterAgent>> | undefined;
  let implementationPromptContent: string | undefined;
  let codingPlanOutput: Awaited<ReturnType<typeof runCodingPlanAgent>> | undefined;
  let developerOutput: Awaited<ReturnType<typeof runDeveloperAgent>> | undefined;
  let reviewReportContent: string | undefined;

  for (const step of enabledSteps) {
    emitWorkflowProgress(runId, "STAGE_STARTED", {
      stage: step.name,
      message: `Starting: ${step.name}`,
    });

    if (step.agentName) {
      emitWorkflowProgress(runId, "AGENT_STARTED", {
        agentRole: step.agentName,
        message: `${step.agentName} is working on: ${step.name}`,
      });
    }

    const kind = step.kind ?? "custom";

    try {
      await executeStep(kind, step, {
        runId,
        requirement: input.requirement,
        projectRoot: input.projectRoot,
        repoAnalysis,
        paths,
        artifacts,
        templateDir,
        agentMapping: input.agentMapping,
        cliConfigs: input.cliConfigs,
        agentBackendConfig: input.agentBackendConfig,
        targetAgent: input.targetAgent,
        plannerSelection: input.plannerSelection,
        generateIntegrationPlan: input.generateIntegrationPlan,
        generateReleasePlan: input.generateReleasePlan,
        baOutput,
        poOutput,
        architectOutput,
        frontendPlannerOutput,
        backendPlannerOutput,
        pmOutput,
        qaOutput,
        userJourneyOutput,
        uiDesignerOutput,
        uxWriterOutput,
        implementationPromptContent,
        codingPlanOutput,
        developerOutput,
        reviewReportContent,
      });

      // Capture outputs for downstream steps
      if (kind === "requirements" || kind === "clarification") {
        // BA output was updated inside executeStep via context mutation
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emitWorkflowProgress(runId, "ERROR", {
        stage: step.name,
        message: `Step "${step.name}" failed: ${message}`,
        status: "FAILED",
      });
      return {
        runId,
        status: "FAILED",
        artifacts,
        createdAt,
        completedAt: nowIso(),
        memoryUsed: undefined,
        error: `Step "${step.name}" failed: ${message}`,
      };
    }

    emitWorkflowProgress(runId, "STAGE_COMPLETED", {
      stage: step.name,
      message: `Completed: ${step.name}`,
    });
  }

  emitWorkflowProgress(runId, "WORKFLOW_COMPLETED", {
    message: "Workflow completed",
    status: "REPORT_GENERATED",
  });

  return {
    runId,
    status: "REPORT_GENERATED",
    artifacts,
    createdAt,
    completedAt: nowIso(),
    memoryUsed: undefined,
  };
}

interface StepContext {
  runId: string;
  requirement: string;
  projectRoot: string | undefined;
  repoAnalysis: Awaited<ReturnType<typeof analyzeRepository>> | undefined;
  paths: ArtifactPaths;
  artifacts: string[];
  templateDir: string | undefined;
  agentMapping: Record<string, string> | undefined;
  cliConfigs:
    | Record<string, { enabled: boolean; command: string; timeoutSeconds: number }>
    | undefined;
  agentBackendConfig: AgentBackendConfig | undefined;
  targetAgent: "claude-code" | "codex" | "gemini" | "aider" | "generic" | undefined;
  plannerSelection: PlannerSelection | undefined;
  generateIntegrationPlan: boolean | undefined;
  generateReleasePlan: boolean | undefined;
  baOutput: Awaited<ReturnType<typeof runBaAgent>> | undefined;
  poOutput: Awaited<ReturnType<typeof runPoAgent>> | undefined;
  architectOutput: Awaited<ReturnType<typeof runArchitectAgent>> | undefined;
  frontendPlannerOutput: Awaited<ReturnType<typeof runFrontendPlannerAgent>> | undefined;
  backendPlannerOutput: Awaited<ReturnType<typeof runBackendPlannerAgent>> | undefined;
  pmOutput: Awaited<ReturnType<typeof runPmAgent>> | undefined;
  qaOutput: Awaited<ReturnType<typeof runQaAgent>> | undefined;
  userJourneyOutput: Awaited<ReturnType<typeof runUserJourneyAgent>> | undefined;
  uiDesignerOutput: Awaited<ReturnType<typeof runUiDesignerAgent>> | undefined;
  uxWriterOutput: Awaited<ReturnType<typeof runUxWriterAgent>> | undefined;
  implementationPromptContent: string | undefined;
  codingPlanOutput: Awaited<ReturnType<typeof runCodingPlanAgent>> | undefined;
  developerOutput: Awaited<ReturnType<typeof runDeveloperAgent>> | undefined;
  reviewReportContent: string | undefined;
}

async function executeStep(
  kind: WorkflowStepKind,
  step: WorkflowTemplate["steps"][0],
  ctx: StepContext,
): Promise<void> {
  const roleKey = (step.agentName ?? "BA") as unknown as Parameters<typeof getAiToolConfig>[0];
  const tool =
    ctx.agentMapping && ctx.cliConfigs
      ? getAiToolConfig(roleKey, ctx.agentMapping, ctx.cliConfigs)
      : undefined;

  const combinedDesign = (): string =>
    [
      ctx.architectOutput?.technicalDesign ?? "",
      ctx.frontendPlannerOutput?.componentTree ?? "",
      ctx.backendPlannerOutput?.serviceLayer ?? "",
    ].join("\n");

  switch (kind) {
    case "clarification":
    case "requirements": {
      const baInput = { requirement: ctx.requirement };
      ctx.baOutput = await runBaAgent(baInput, {
        templateDir: ctx.templateDir,
        aiTool: tool,
        agentBackendConfig: ctx.agentBackendConfig,
      });
      await writeArtifact(
        join(ctx.paths.requirementDir, "clarified-requirement.md"),
        ctx.baOutput.clarifiedRequirement,
      );
      ctx.artifacts.push(join(ctx.paths.requirementDir, "clarified-requirement.md"));
      await writeArtifact(
        join(ctx.paths.requirementDir, "business-rules.md"),
        ctx.baOutput.businessRules,
      );
      ctx.artifacts.push(join(ctx.paths.requirementDir, "business-rules.md"));
      await writeArtifact(
        join(ctx.paths.requirementDir, "acceptance-criteria.md"),
        ctx.baOutput.acceptanceCriteria,
      );
      ctx.artifacts.push(join(ctx.paths.requirementDir, "acceptance-criteria.md"));
      emitWorkflowProgress(ctx.runId, "ARTIFACT_GENERATED", {
        artifactType: "CLARIFIED_REQUIREMENT",
        message: "Requirements generated",
      });
      break;
    }

    case "ui_ux": {
      if (!ctx.baOutput) throw new Error("BA output required before UI/UX step");
      if (step.id === "ux-research" || step.agentName === "UX Researcher") {
        ctx.userJourneyOutput = await runUserJourneyAgent(
          {
            requirement: ctx.requirement,
            clarifiedRequirement: ctx.baOutput.clarifiedRequirement,
            acceptanceCriteria: ctx.baOutput.acceptanceCriteria,
            scopeDefinition: ctx.poOutput?.productGoal ?? "",
          },
          {
            templateDir: ctx.templateDir,
            aiTool: tool,
            agentBackendConfig: ctx.agentBackendConfig,
          },
        );
        await writeArtifact(ctx.paths.userJourneyPath, ctx.userJourneyOutput.userPersonas);
        ctx.artifacts.push(ctx.paths.userJourneyPath);
      }
      if (step.id === "ui-design" || step.agentName === "UI Designer") {
        ctx.uiDesignerOutput = await runUiDesignerAgent(
          {
            requirement: ctx.requirement,
            clarifiedRequirement: ctx.baOutput.clarifiedRequirement,
            userPersonas: ctx.userJourneyOutput?.userPersonas ?? "",
            userFlows: ctx.userJourneyOutput?.userFlows ?? "",
          },
          {
            templateDir: ctx.templateDir,
            aiTool: tool,
            agentBackendConfig: ctx.agentBackendConfig,
          },
        );
        await writeArtifact(ctx.paths.uxDesignPath, ctx.uiDesignerOutput.screenDescriptions);
        ctx.artifacts.push(ctx.paths.uxDesignPath);
      }
      if (step.id === "ux-writing" || step.agentName === "UX Writer") {
        ctx.uxWriterOutput = await runUxWriterAgent(
          {
            requirement: ctx.requirement,
            screenDescriptions: ctx.uiDesignerOutput?.screenDescriptions ?? "",
            componentTree: ctx.uiDesignerOutput?.componentTree ?? "",
          },
          {
            templateDir: ctx.templateDir,
            aiTool: tool,
            agentBackendConfig: ctx.agentBackendConfig,
          },
        );
        await writeArtifact(ctx.paths.uxCopyPath, ctx.uxWriterOutput.interfaceLabels);
        ctx.artifacts.push(ctx.paths.uxCopyPath);
      }
      break;
    }

    case "architecture": {
      ctx.architectOutput = await runArchitectAgent(
        {
          requirement: ctx.requirement,
          clarifiedRequirement: ctx.baOutput?.clarifiedRequirement ?? ctx.requirement,
          ...(ctx.repoAnalysis ? { repositoryAnalysis: ctx.repoAnalysis } : {}),
        },
        { templateDir: ctx.templateDir, aiTool: tool, agentBackendConfig: ctx.agentBackendConfig },
      );
      await writeArtifact(
        join(ctx.paths.designDir, "technical-design.md"),
        ctx.architectOutput.technicalDesign,
      );
      ctx.artifacts.push(join(ctx.paths.designDir, "technical-design.md"));
      await writeArtifact(
        join(ctx.paths.designDir, "api-design.md"),
        ctx.architectOutput.apiDesign,
      );
      ctx.artifacts.push(join(ctx.paths.designDir, "api-design.md"));
      await writeArtifact(join(ctx.paths.designDir, "db-design.md"), ctx.architectOutput.dbDesign);
      ctx.artifacts.push(join(ctx.paths.designDir, "db-design.md"));
      emitWorkflowProgress(ctx.runId, "ARTIFACT_GENERATED", {
        artifactType: "TECHNICAL_DESIGN",
        message: "Architecture design generated",
      });
      break;
    }

    case "api_data": {
      // API/data design uses the architect agent's API + DB design output
      ctx.architectOutput = await runArchitectAgent(
        {
          requirement: ctx.requirement,
          clarifiedRequirement: ctx.baOutput?.clarifiedRequirement ?? ctx.requirement,
          ...(ctx.repoAnalysis ? { repositoryAnalysis: ctx.repoAnalysis } : {}),
        },
        { templateDir: ctx.templateDir, aiTool: tool, agentBackendConfig: ctx.agentBackendConfig },
      );
      await writeArtifact(
        join(ctx.paths.designDir, "api-design.md"),
        ctx.architectOutput.apiDesign,
      );
      ctx.artifacts.push(join(ctx.paths.designDir, "api-design.md"));
      await writeArtifact(join(ctx.paths.designDir, "db-design.md"), ctx.architectOutput.dbDesign);
      ctx.artifacts.push(join(ctx.paths.designDir, "db-design.md"));
      emitWorkflowProgress(ctx.runId, "ARTIFACT_GENERATED", {
        artifactType: "API_DATA_DESIGN",
        message: "API and data design generated",
      });
      break;
    }

    case "frontend_plan": {
      if (!ctx.baOutput) throw new Error("BA output required before frontend planning");
      ctx.frontendPlannerOutput = await runFrontendPlannerAgent(
        {
          requirement: ctx.requirement,
          clarifiedRequirement: ctx.baOutput.clarifiedRequirement,
          ...(ctx.repoAnalysis ? { repositoryAnalysis: ctx.repoAnalysis } : {}),
        },
        { templateDir: ctx.templateDir, aiTool: tool, agentBackendConfig: ctx.agentBackendConfig },
      );
      await writeArtifact(ctx.paths.frontendDesignPath, ctx.frontendPlannerOutput.componentTree);
      ctx.artifacts.push(ctx.paths.frontendDesignPath);
      break;
    }

    case "backend_plan": {
      if (!ctx.baOutput) throw new Error("BA output required before backend planning");
      ctx.backendPlannerOutput = await runBackendPlannerAgent(
        {
          requirement: ctx.requirement,
          clarifiedRequirement: ctx.baOutput.clarifiedRequirement,
          ...(ctx.repoAnalysis ? { repositoryAnalysis: ctx.repoAnalysis } : {}),
        },
        { templateDir: ctx.templateDir, aiTool: tool, agentBackendConfig: ctx.agentBackendConfig },
      );
      await writeArtifact(ctx.paths.backendDesignPath, ctx.backendPlannerOutput.serviceLayer);
      ctx.artifacts.push(ctx.paths.backendDesignPath);
      break;
    }

    case "tasks": {
      ctx.pmOutput = await runPmAgent(
        {
          requirement: ctx.requirement,
          technicalDesign: combinedDesign(),
          acceptanceCriteria: ctx.baOutput?.acceptanceCriteria ?? "",
        },
        { templateDir: ctx.templateDir, aiTool: tool, agentBackendConfig: ctx.agentBackendConfig },
      );
      await writeArtifact(
        join(ctx.paths.tasksDir, "task-breakdown.md"),
        ctx.pmOutput.taskBreakdownMd,
      );
      ctx.artifacts.push(join(ctx.paths.tasksDir, "task-breakdown.md"));
      await writeArtifact(
        join(ctx.paths.tasksDir, "task-breakdown.json"),
        ctx.pmOutput.taskBreakdownJson,
      );
      ctx.artifacts.push(join(ctx.paths.tasksDir, "task-breakdown.json"));
      break;
    }

    case "implementation_prompt": {
      // Generate implementation prompt using coding plan + developer agents
      ctx.codingPlanOutput = await runCodingPlanAgent(
        {
          requirement: ctx.requirement,
          clarifiedRequirement: ctx.baOutput?.clarifiedRequirement ?? ctx.requirement,
          businessRules: ctx.baOutput?.businessRules ?? "",
          acceptanceCriteria: ctx.baOutput?.acceptanceCriteria ?? "",
          technicalDesign: combinedDesign(),
          apiDesign: ctx.architectOutput?.apiDesign ?? "",
          dbDesign: ctx.architectOutput?.dbDesign ?? "",
          taskBreakdownMd: ctx.pmOutput?.taskBreakdownMd ?? "",
          testMatrixMd: ctx.qaOutput?.testMatrixMd ?? "",
          targetAgent: ctx.targetAgent ?? "generic",
        },
        { templateDir: ctx.templateDir, aiTool: tool, agentBackendConfig: ctx.agentBackendConfig },
      );
      await writeArtifact(ctx.paths.codingPlanPath, ctx.codingPlanOutput.codingPlanMd);
      ctx.artifacts.push(ctx.paths.codingPlanPath);

      ctx.developerOutput = await runDeveloperAgent(
        {
          requirement: ctx.requirement,
          clarifiedRequirement: ctx.baOutput?.clarifiedRequirement ?? ctx.requirement,
          businessRules: ctx.baOutput?.businessRules ?? "",
          acceptanceCriteria: ctx.baOutput?.acceptanceCriteria ?? "",
          technicalDesign: combinedDesign(),
          apiDesign: ctx.architectOutput?.apiDesign ?? "",
          dbDesign: ctx.architectOutput?.dbDesign ?? "",
          taskBreakdownMd: ctx.pmOutput?.taskBreakdownMd ?? "",
          testMatrixMd: ctx.qaOutput?.testMatrixMd ?? "",
          codingPlanMd: ctx.codingPlanOutput.codingPlanMd,
          targetAgent: ctx.targetAgent,
        },
        { templateDir: ctx.templateDir, aiTool: tool, agentBackendConfig: ctx.agentBackendConfig },
      );
      await writeArtifact(
        ctx.paths.implementationPromptPath,
        ctx.developerOutput.implementationPrompt,
      );
      ctx.artifacts.push(ctx.paths.implementationPromptPath);
      ctx.implementationPromptContent = ctx.developerOutput.implementationPrompt;
      emitWorkflowProgress(ctx.runId, "ARTIFACT_GENERATED", {
        artifactType: "IMPLEMENTATION_PROMPT",
        message: "Implementation prompt generated",
      });
      break;
    }

    case "coding_execution": {
      // Requires approval before execution (enforced at workflow level)
      // Use AgentBackend if configured, otherwise throw clear error
      if (!ctx.agentBackendConfig || ctx.agentBackendConfig.provider === "none") {
        throw new Error(
          "Coding execution requires an AI provider to be configured. " +
            "Set CODECLAW_OPENAI_API_KEY and configure agentBackend in config.json, " +
            "or switch to a docs-only workflow template.",
        );
      }
      if (!ctx.implementationPromptContent) {
        throw new Error(
          "Implementation prompt is required before coding execution. " +
            "Ensure an 'implementation_prompt' step runs before 'coding_execution' in your workflow template.",
        );
      }
      // Execute via AgentBackend
      const codingResult = await runWithAgentBackend({
        config: ctx.agentBackendConfig,
        agentId: "coding-execution",
        agentName: step.agentName ?? "Developer",
        systemPrompt:
          "You are a software developer. Implement the requested changes based on the implementation prompt.",
        userPrompt: ctx.implementationPromptContent,
        context: { requirement: ctx.requirement },
        outputFormat: "markdown",
      });
      if (!codingResult) {
        throw new Error("Coding execution failed: AgentBackend returned no result");
      }
      await writeArtifact(ctx.paths.agentLogPath, codingResult.content);
      ctx.artifacts.push(ctx.paths.agentLogPath);
      emitWorkflowProgress(ctx.runId, "ARTIFACT_GENERATED", {
        artifactType: "CODE_GENERATION",
        message: "Code generation completed",
      });
      break;
    }

    case "testing": {
      if (!ctx.baOutput) throw new Error("BA output required before testing");
      ctx.qaOutput = await runQaAgent(
        {
          requirement: ctx.requirement,
          acceptanceCriteria: ctx.baOutput.acceptanceCriteria,
          taskBreakdownJson: ctx.pmOutput?.taskBreakdownJson ?? "[]",
        },
        { templateDir: ctx.templateDir, aiTool: tool, agentBackendConfig: ctx.agentBackendConfig },
      );
      await writeArtifact(join(ctx.paths.testsDir, "test-matrix.md"), ctx.qaOutput.testMatrixMd);
      ctx.artifacts.push(join(ctx.paths.testsDir, "test-matrix.md"));
      await writeArtifact(
        join(ctx.paths.testsDir, "test-matrix.json"),
        ctx.qaOutput.testMatrixJson,
      );
      ctx.artifacts.push(join(ctx.paths.testsDir, "test-matrix.json"));
      break;
    }

    case "review": {
      // Generate code review using reviewer agents
      const reviewerOutput = await runCodeReviewerAgent(
        {
          clarifiedRequirement: ctx.baOutput?.clarifiedRequirement ?? ctx.requirement,
          acceptanceCriteria: ctx.baOutput?.acceptanceCriteria ?? "",
          technicalDesign: combinedDesign(),
          changedFiles: "",
          diff: "",
          testResults: ctx.qaOutput?.testMatrixMd ?? "",
        },
        { templateDir: ctx.templateDir, aiTool: tool, agentBackendConfig: ctx.agentBackendConfig },
      );
      await writeArtifact(ctx.paths.reviewReportPath, reviewerOutput.reviewReport);
      ctx.artifacts.push(ctx.paths.reviewReportPath);
      ctx.reviewReportContent = reviewerOutput.reviewReport;
      emitWorkflowProgress(ctx.runId, "ARTIFACT_GENERATED", {
        artifactType: "REVIEW_REPORT",
        message: "Review report generated",
      });
      break;
    }

    case "release_plan": {
      const devopsOutput = await runDevopsReleaseAgent(
        {
          requirement: ctx.requirement,
          clarifiedRequirement: ctx.baOutput?.clarifiedRequirement ?? ctx.requirement,
          technicalDesign: combinedDesign(),
          apiDesign: ctx.architectOutput?.apiDesign ?? "",
          taskBreakdownMd: ctx.pmOutput?.taskBreakdownMd ?? "",
        },
        { templateDir: ctx.templateDir, aiTool: tool, agentBackendConfig: ctx.agentBackendConfig },
      );
      await writeArtifact(ctx.paths.releasePlanPath, devopsOutput.releasePlan);
      ctx.artifacts.push(ctx.paths.releasePlanPath);
      break;
    }

    case "documentation": {
      if (!ctx.qaOutput) throw new Error("QA output required before documentation");
      const traceabilityOutput = await runTraceabilityAgent(
        { runId: ctx.runId, artifactPaths: ctx.paths },
        { templateDir: ctx.templateDir, aiTool: tool, agentBackendConfig: ctx.agentBackendConfig },
      );
      const traceabilityMd = traceabilityToEnhancedMarkdown(traceabilityOutput);
      await writeArtifact(ctx.paths.traceabilityMd, traceabilityMd);
      ctx.artifacts.push(ctx.paths.traceabilityMd);
      break;
    }

    case "final_report": {
      const reporterOutput = await runReporterAgent(
        {
          requirement: ctx.requirement,
          clarifiedRequirement: ctx.baOutput?.clarifiedRequirement ?? ctx.requirement,
          businessRules: ctx.baOutput?.businessRules ?? "",
          acceptanceCriteria: ctx.baOutput?.acceptanceCriteria ?? "",
          technicalDesign: combinedDesign(),
          apiDesign: ctx.architectOutput?.apiDesign ?? "",
          dbDesign: ctx.architectOutput?.dbDesign ?? "",
          taskBreakdownMd: ctx.pmOutput?.taskBreakdownMd ?? "",
          testMatrixMd: ctx.qaOutput?.testMatrixMd ?? "",
          traceabilitySection: ctx.reviewReportContent ?? "",
        },
        { templateDir: ctx.templateDir, aiTool: tool, agentBackendConfig: ctx.agentBackendConfig },
      );
      await writeArtifact(join(ctx.paths.reportDir, "final-report.md"), reporterOutput.finalReport);
      ctx.artifacts.push(join(ctx.paths.reportDir, "final-report.md"));
      break;
    }

    case "custom": {
      // Option A: Prompt-only custom step using AgentBackend
      if (
        step.description &&
        ctx.agentBackendConfig &&
        ctx.agentBackendConfig.provider !== "none"
      ) {
        const result = await runWithAgentBackend({
          config: ctx.agentBackendConfig,
          agentId: `custom-${step.id}`,
          agentName: step.agentName ?? "Custom",
          systemPrompt:
            "You are executing a custom workflow step. Follow the step description carefully and produce the expected output.",
          userPrompt: `Step: ${step.name}\nDescription: ${step.description}\n\nContext - Requirement: ${ctx.requirement}\n`,
          context: { requirement: ctx.requirement, stepName: step.name },
          outputFormat: "markdown",
        });
        const outputPath = join(ctx.paths.runDir, `${step.id}-output.md`);
        await writeArtifact(outputPath, result?.content ?? "No output generated");
        ctx.artifacts.push(outputPath);
        emitWorkflowProgress(ctx.runId, "ARTIFACT_GENERATED", {
          artifactType: "CUSTOM_STEP",
          message: `Custom step "${step.name}" completed`,
        });
      } else {
        // Option B: Clear error if no provider or description
        throw new Error(
          `Custom step "${step.name}" requires an AI provider (AgentBackend) and a step description. ` +
            "Configure a provider via CODECLAW_OPENAI_API_KEY or add a description to the step.",
        );
      }
      break;
    }

    default:
      throw new Error(
        `Unsupported step kind "${String(kind)}" for step "${step.name}". This step kind is not yet implemented in the custom workflow engine.`,
      );
  }
}

export function validateWorkflowTemplateSteps(template: WorkflowTemplate): string[] {
  const errors: string[] = [];
  const enabledSteps = template.steps.filter((s) => s.enabled);

  if (enabledSteps.length === 0) {
    errors.push("Workflow has no enabled steps");
  }

  const supportedKinds: WorkflowStepKind[] = [
    "clarification",
    "requirements",
    "ui_ux",
    "architecture",
    "frontend_plan",
    "backend_plan",
    "api_data",
    "tasks",
    "implementation_prompt",
    "coding_execution",
    "testing",
    "review",
    "release_plan",
    "documentation",
    "final_report",
    "custom",
  ];

  for (const step of enabledSteps) {
    const kind = step.kind ?? "custom";
    if (!supportedKinds.includes(kind)) {
      errors.push(`Unsupported step kind "${kind}" for step "${step.name}"`);
    }
    if (kind === "coding_execution") {
      errors.push(
        `Step "${step.name}" (coding_execution) requires approval gate and AI provider configuration`,
      );
    }
  }

  return errors;
}
