import { join } from "node:path";
import { createRunId, nowIso } from "@aiteam/shared";
import type { SlackIntegrationConfig } from "@aiteam/shared";
import { createArtifactDirs, writeArtifact } from "../artifacts/artifactWriter.js";
import { runBaAgent } from "../agents/baAgent.js";
import { runArchitectAgent } from "../agents/architectAgent.js";
import { runFrontendPlannerAgent } from "../agents/frontendPlannerAgent.js";
import { runBackendPlannerAgent } from "../agents/backendPlannerAgent.js";
import { runIntegrationPlannerAgent } from "../agents/integrationPlannerAgent.js";
import { runDevopsReleaseAgent } from "../agents/devopsReleaseAgent.js";
import { runPmAgent } from "../agents/pmAgent.js";
import { runQaAgent } from "../agents/qaAgent.js";
import { runUserJourneyAgent } from "../agents/userJourneyAgent.js";
import { runUiDesignerAgent } from "../agents/uiDesignerAgent.js";
import { runUxWriterAgent } from "../agents/uxWriterAgent.js";
import { runCodingPlanAgent } from "../agents/codingPlanAgent.js";
import { runDeveloperAgent } from "../agents/developerAgent.js";
import { runReporterAgent } from "../agents/reporterAgent.js";
import {
  runTraceabilityAgent,
  traceabilityToEnhancedMarkdown,
} from "../agents/traceabilityAgent.js";
import { analyzeRepository, analysisToMarkdown } from "../repoAnalyzer/repoAnalyzer.js";
import { getAiToolConfig, resolvePlannerSelection } from "./workflowHelpers.js";
import type { AiToolConfig, PlannerSelection } from "./workflowHelpers.js";
import { buildReportReadyMessage } from "../integrations/slackMessageTemplates.js";
import type { SlackMessageInput } from "../integrations/slackMessageTemplates.js";
import { emitWorkflowProgress } from "./workflowEmitter.js";

export interface AssistedWorkflowInput {
  requirement: string;
  projectRoot: string | undefined;
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
  targetAgent?: "claude-code" | "codex" | "gemini" | "aider" | "generic";
  slackConfig?: SlackIntegrationConfig;
  plannerSelection?: PlannerSelection;
  generateIntegrationPlan?: boolean;
  generateReleasePlan?: boolean;
}

export interface AssistedWorkflowOutput {
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
}

export async function runAssistedWorkflow(
  input: AssistedWorkflowInput,
): Promise<AssistedWorkflowOutput> {
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

  const uxResearcherTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("UX_RESEARCHER", input.agentMapping, input.cliConfigs)
      : undefined;

  const uiDesignerTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("UI_DESIGNER", input.agentMapping, input.cliConfigs)
      : undefined;

  const uxWriterTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("UX_WRITER", input.agentMapping, input.cliConfigs)
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

  await writeArtifact(paths.inputFile, `# Raw Requirement\n\n${input.requirement}\n`);
  artifacts.push(paths.inputFile);

  emitWorkflowProgress(runId, "WORKFLOW_STARTED", {
    stage: "Workflow Started",
    message: "Workflow started",
    stages: [
      "Repository Analysis",
      "BA Analysis",
      "Architecture Design",
      "Integration Planning",
      "Frontend Planning",
      "Backend Planning",
      "Task Breakdown",
      "Test Planning",
      "UX Research",
      "UI Design",
      "UX Writing",
      "Coding Plan",
      "Developer Implementation",
      "DevOps Release",
      "Traceability",
      "Final Report",
    ],
  });

  const repoAnalysis = input.projectRoot ? await analyzeRepository(input.projectRoot) : undefined;

  if (repoAnalysis) {
    const analysisContent = analysisToMarkdown(repoAnalysis);
    await writeArtifact(join(paths.designDir, "repository-analysis.md"), analysisContent);
    artifacts.push(join(paths.designDir, "repository-analysis.md"));
  }

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "BA Analysis",
    message: "BA Analysis started",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", { agentRole: "BA", message: "BA agent started" });

  const baOutput = await runBaAgent(
    { requirement: input.requirement },
    { templateDir, aiTool: baTool },
  );

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "BA",
    message: "BA agent completed",
  });

  await writeArtifact(
    join(paths.requirementDir, "clarified-requirement.md"),
    baOutput.clarifiedRequirement,
  );
  artifacts.push(join(paths.requirementDir, "clarified-requirement.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "clarified-requirement",
    message: "Clarified requirement generated",
  });

  await writeArtifact(join(paths.requirementDir, "business-rules.md"), baOutput.businessRules);
  artifacts.push(join(paths.requirementDir, "business-rules.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "business-rules",
    message: "Business rules generated",
  });

  await writeArtifact(
    join(paths.requirementDir, "acceptance-criteria.md"),
    baOutput.acceptanceCriteria,
  );
  artifacts.push(join(paths.requirementDir, "acceptance-criteria.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "acceptance-criteria",
    message: "Acceptance criteria generated",
  });

  await writeArtifact(join(paths.requirementDir, "open-questions.md"), baOutput.openQuestions);
  artifacts.push(join(paths.requirementDir, "open-questions.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "open-questions",
    message: "Open questions generated",
  });

  await writeArtifact(join(paths.requirementDir, "assumptions.md"), baOutput.assumptions);
  artifacts.push(join(paths.requirementDir, "assumptions.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "assumptions",
    message: "Assumptions generated",
  });

  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "BA Analysis",
    message: "BA Analysis completed",
  });

  const architectInput: Parameters<typeof runArchitectAgent>[0] = {
    requirement: input.requirement,
    clarifiedRequirement: baOutput.clarifiedRequirement,
    ...(repoAnalysis ? { repositoryAnalysis: repoAnalysis } : {}),
  };

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "Architecture Design",
    message: "Architecture Design started",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "ARCHITECT",
    message: "Architect agent started",
  });

  const architectOutput = await runArchitectAgent(architectInput, {
    templateDir,
    aiTool: architectTool,
  });

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "ARCHITECT",
    message: "Architect agent completed",
  });

  await writeArtifact(
    join(paths.designDir, "technical-design.md"),
    architectOutput.technicalDesign,
  );
  artifacts.push(join(paths.designDir, "technical-design.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "technical-design",
    message: "Technical design generated",
  });

  await writeArtifact(join(paths.designDir, "api-design.md"), architectOutput.apiDesign);
  artifacts.push(join(paths.designDir, "api-design.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "api-design",
    message: "API design generated",
  });

  await writeArtifact(join(paths.designDir, "db-design.md"), architectOutput.dbDesign);
  artifacts.push(join(paths.designDir, "db-design.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "db-design",
    message: "DB design generated",
  });

  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "Architecture Design",
    message: "Architecture Design completed",
  });

  let integrationPlanOutput: Awaited<ReturnType<typeof runIntegrationPlannerAgent>> | undefined;

  if (input.generateIntegrationPlan ?? false) {
    emitWorkflowProgress(runId, "STAGE_STARTED", {
      stage: "Integration Planning",
      message: "Integration Planning started",
    });
    emitWorkflowProgress(runId, "AGENT_STARTED", {
      agentRole: "INTEGRATION_PLANNER",
      message: "Integration Planner agent started",
    });

    integrationPlanOutput = await runIntegrationPlannerAgent(
      {
        requirement: input.requirement,
        clarifiedRequirement: baOutput.clarifiedRequirement,
        apiDesign: architectOutput.apiDesign,
        technicalDesign: architectOutput.technicalDesign,
      },
      { templateDir, aiTool: integrationPlannerTool },
    );

    emitWorkflowProgress(runId, "AGENT_COMPLETED", {
      agentRole: "INTEGRATION_PLANNER",
      message: "Integration Planner agent completed",
    });

    await writeArtifact(paths.integrationPlanPath, integrationPlanOutput.integrationPlan);
    artifacts.push(paths.integrationPlanPath);
    emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
      artifactType: "integration-plan",
      message: "Integration plan generated",
    });

    emitWorkflowProgress(runId, "STAGE_COMPLETED", {
      stage: "Integration Planning",
      message: "Integration Planning completed",
    });
  }

  const plannerSelection = resolvePlannerSelection(
    input.plannerSelection,
    repoAnalysis?.projectType,
  );

  let frontendPlannerOutput: Awaited<ReturnType<typeof runFrontendPlannerAgent>> | undefined;
  let backendPlannerOutput: Awaited<ReturnType<typeof runBackendPlannerAgent>> | undefined;

  if (plannerSelection.runFrontend) {
    emitWorkflowProgress(runId, "STAGE_STARTED", {
      stage: "Frontend Planning",
      message: "Frontend Planning started",
    });
    emitWorkflowProgress(runId, "AGENT_STARTED", {
      agentRole: "FRONTEND_PLANNER",
      message: "Frontend Planner agent started",
    });

    frontendPlannerOutput = await runFrontendPlannerAgent(
      {
        requirement: input.requirement,
        clarifiedRequirement: baOutput.clarifiedRequirement,
        ...(repoAnalysis ? { repositoryAnalysis: repoAnalysis } : {}),
      },
      { templateDir, aiTool: frontendPlannerTool },
    );

    emitWorkflowProgress(runId, "AGENT_COMPLETED", {
      agentRole: "FRONTEND_PLANNER",
      message: "Frontend Planner agent completed",
    });

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
    emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
      artifactType: "frontend-design",
      message: "Frontend design generated",
    });

    emitWorkflowProgress(runId, "STAGE_COMPLETED", {
      stage: "Frontend Planning",
      message: "Frontend Planning completed",
    });
  }

  if (plannerSelection.runBackend) {
    emitWorkflowProgress(runId, "STAGE_STARTED", {
      stage: "Backend Planning",
      message: "Backend Planning started",
    });
    emitWorkflowProgress(runId, "AGENT_STARTED", {
      agentRole: "BACKEND_PLANNER",
      message: "Backend Planner agent started",
    });

    backendPlannerOutput = await runBackendPlannerAgent(
      {
        requirement: input.requirement,
        clarifiedRequirement: baOutput.clarifiedRequirement,
        ...(repoAnalysis ? { repositoryAnalysis: repoAnalysis } : {}),
      },
      { templateDir, aiTool: backendPlannerTool },
    );

    emitWorkflowProgress(runId, "AGENT_COMPLETED", {
      agentRole: "BACKEND_PLANNER",
      message: "Backend Planner agent completed",
    });

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
    emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
      artifactType: "backend-design",
      message: "Backend design generated",
    });

    emitWorkflowProgress(runId, "STAGE_COMPLETED", {
      stage: "Backend Planning",
      message: "Backend Planning completed",
    });
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

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "Task Breakdown",
    message: "Task Breakdown started",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "PROJECT_MANAGER",
    message: "Project Manager agent started",
  });

  const pmOutput = await runPmAgent(
    {
      requirement: input.requirement,
      technicalDesign: combinedDesign,
    },
    { templateDir, aiTool: pmTool },
  );

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "PROJECT_MANAGER",
    message: "Project Manager agent completed",
  });

  await writeArtifact(join(paths.tasksDir, "task-breakdown.md"), pmOutput.taskBreakdownMd);
  artifacts.push(join(paths.tasksDir, "task-breakdown.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "task-breakdown-md",
    message: "Task breakdown markdown generated",
  });

  await writeArtifact(join(paths.tasksDir, "task-breakdown.json"), pmOutput.taskBreakdownJson);
  artifacts.push(join(paths.tasksDir, "task-breakdown.json"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "task-breakdown-json",
    message: "Task breakdown JSON generated",
  });

  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "Task Breakdown",
    message: "Task Breakdown completed",
  });

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "Test Planning",
    message: "Test Planning started",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", { agentRole: "QA", message: "QA agent started" });

  const qaOutput = await runQaAgent(
    {
      requirement: input.requirement,
      acceptanceCriteria: baOutput.acceptanceCriteria,
      taskBreakdownJson: pmOutput.taskBreakdownJson,
    },
    { templateDir, aiTool: qaTool },
  );

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "QA",
    message: "QA agent completed",
  });

  await writeArtifact(join(paths.testsDir, "test-matrix.md"), qaOutput.testMatrixMd);
  artifacts.push(join(paths.testsDir, "test-matrix.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "test-matrix-md",
    message: "Test matrix markdown generated",
  });

  await writeArtifact(join(paths.testsDir, "test-matrix.json"), qaOutput.testMatrixJson);
  artifacts.push(join(paths.testsDir, "test-matrix.json"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "test-matrix-json",
    message: "Test matrix JSON generated",
  });

  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "Test Planning",
    message: "Test Planning completed",
  });

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "UX Research",
    message: "UX Research started",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "UX_RESEARCHER",
    message: "UX Researcher agent started",
  });

  const userJourneyOutput = await runUserJourneyAgent(
    {
      requirement: input.requirement,
      clarifiedRequirement: baOutput.clarifiedRequirement,
      acceptanceCriteria: baOutput.acceptanceCriteria,
      scopeDefinition: "",
    },
    { templateDir, aiTool: uxResearcherTool },
  );

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "UX_RESEARCHER",
    message: "UX Researcher agent completed",
  });

  await writeArtifact(
    paths.userJourneyPath,
    [
      "## User Personas\n",
      userJourneyOutput.userPersonas,
      "\n\n## User Flows\n",
      userJourneyOutput.userFlows,
      "\n\n## Journey Map\n",
      userJourneyOutput.journeyMap,
    ].join("\n"),
  );
  artifacts.push(paths.userJourneyPath);
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "user-journey",
    message: "User journey generated",
  });

  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "UX Research",
    message: "UX Research completed",
  });

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "UI Design",
    message: "UI Design started",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "UI_DESIGNER",
    message: "UI Designer agent started",
  });

  const uiDesignerOutput = await runUiDesignerAgent(
    {
      requirement: input.requirement,
      clarifiedRequirement: baOutput.clarifiedRequirement,
      userPersonas: userJourneyOutput.userPersonas,
      userFlows: userJourneyOutput.userFlows,
    },
    { templateDir, aiTool: uiDesignerTool },
  );

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "UI_DESIGNER",
    message: "UI Designer agent completed",
  });

  await writeArtifact(
    paths.uxDesignPath,
    [
      "## Screen Descriptions\n",
      uiDesignerOutput.screenDescriptions,
      "\n\n## Component Tree\n",
      uiDesignerOutput.componentTree,
      "\n\n## States\n",
      uiDesignerOutput.states,
    ].join("\n"),
  );
  artifacts.push(paths.uxDesignPath);
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "ux-design",
    message: "UX design generated",
  });

  await writeArtifact(
    paths.componentBreakdownPath,
    ["## Component Tree\n", uiDesignerOutput.componentTree].join("\n"),
  );
  artifacts.push(paths.componentBreakdownPath);
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "component-breakdown",
    message: "Component breakdown generated",
  });

  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "UI Design",
    message: "UI Design completed",
  });

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "UX Writing",
    message: "UX Writing started",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "UX_WRITER",
    message: "UX Writer agent started",
  });

  const uxWriterOutput = await runUxWriterAgent(
    {
      requirement: input.requirement,
      screenDescriptions: uiDesignerOutput.screenDescriptions,
      componentTree: uiDesignerOutput.componentTree,
    },
    { templateDir, aiTool: uxWriterTool },
  );

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "UX_WRITER",
    message: "UX Writer agent completed",
  });

  await writeArtifact(
    paths.uxCopyPath,
    [
      "## Interface Labels\n",
      uxWriterOutput.interfaceLabels,
      "\n\n## Error Messages\n",
      uxWriterOutput.errorMessages,
      "\n\n## Empty State Text\n",
      uxWriterOutput.emptyStateText,
      "\n\n## Tooltips & Help Text\n",
      uxWriterOutput.tooltips,
    ].join("\n"),
  );
  artifacts.push(paths.uxCopyPath);
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "ux-copy",
    message: "UX copy generated",
  });

  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "UX Writing",
    message: "UX Writing completed",
  });

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "Coding Plan",
    message: "Coding Plan started",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "CODING_PLANNER",
    message: "Coding Plan agent started",
  });

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
      targetAgent: input.targetAgent,
    },
    { templateDir, aiTool: codingPlanTool },
  );

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "CODING_PLANNER",
    message: "Coding Plan agent completed",
  });

  await writeArtifact(paths.codingPlanPath, codingPlanOutput.codingPlanMd);
  artifacts.push(paths.codingPlanPath);
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "coding-plan",
    message: "Coding plan generated",
  });

  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "Coding Plan",
    message: "Coding Plan completed",
  });

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "Developer Implementation",
    message: "Developer Implementation started",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "DEVELOPER",
    message: "Developer agent started",
  });

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
      targetAgent: input.targetAgent,
    },
    { templateDir, aiTool: developerTool },
  );

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "DEVELOPER",
    message: "Developer agent completed",
  });

  await writeArtifact(
    join(paths.implementationDir, "implementation-prompt.md"),
    developerOutput.implementationPrompt,
  );
  artifacts.push(join(paths.implementationDir, "implementation-prompt.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "implementation-prompt",
    message: "Implementation prompt generated",
  });

  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "Developer Implementation",
    message: "Developer Implementation completed",
  });

  let devopsReleaseOutput: Awaited<ReturnType<typeof runDevopsReleaseAgent>> | undefined;

  if (input.generateReleasePlan ?? false) {
    emitWorkflowProgress(runId, "STAGE_STARTED", {
      stage: "DevOps Release",
      message: "DevOps Release started",
    });
    emitWorkflowProgress(runId, "AGENT_STARTED", {
      agentRole: "DEVOPS_RELEASE",
      message: "DevOps Release agent started",
    });

    devopsReleaseOutput = await runDevopsReleaseAgent(
      {
        requirement: input.requirement,
        clarifiedRequirement: baOutput.clarifiedRequirement,
        technicalDesign: combinedDesign,
        apiDesign: architectOutput.apiDesign,
        taskBreakdownMd: pmOutput.taskBreakdownMd,
      },
      { templateDir, aiTool: devopsReleaseTool },
    );

    emitWorkflowProgress(runId, "AGENT_COMPLETED", {
      agentRole: "DEVOPS_RELEASE",
      message: "DevOps Release agent completed",
    });

    await writeArtifact(paths.releasePlanPath, devopsReleaseOutput.releasePlan);
    artifacts.push(paths.releasePlanPath);
    emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
      artifactType: "release-plan",
      message: "Release plan generated",
    });

    await writeArtifact(paths.changelogPath, devopsReleaseOutput.changelog);
    artifacts.push(paths.changelogPath);
    emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
      artifactType: "changelog",
      message: "Changelog generated",
    });

    emitWorkflowProgress(runId, "STAGE_COMPLETED", {
      stage: "DevOps Release",
      message: "DevOps Release completed",
    });
  }

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "Traceability",
    message: "Traceability started",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "TRACEABILITY",
    message: "Traceability agent started",
  });

  const traceabilityOutput = await runTraceabilityAgent(
    { runId, artifactPaths: paths },
    { templateDir, aiTool: traceabilityTool },
  );

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "TRACEABILITY",
    message: "Traceability agent completed",
  });

  const traceabilityMd = traceabilityToEnhancedMarkdown(traceabilityOutput);
  await writeArtifact(paths.traceabilityMd, traceabilityMd);
  artifacts.push(paths.traceabilityMd);
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "traceability-md",
    message: "Traceability markdown generated",
  });

  await writeArtifact(paths.traceabilityJson, JSON.stringify(traceabilityOutput.matrix, null, 2));
  artifacts.push(paths.traceabilityJson);
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "traceability-json",
    message: "Traceability JSON generated",
  });

  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "Traceability",
    message: "Traceability completed",
  });

  const traceabilitySection = traceabilityMd;

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "Final Report",
    message: "Final Report started",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "REPORTER",
    message: "Reporter agent started",
  });

  const reporterOutput = await runReporterAgent(
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
      traceabilitySection,
      integrationPlanSection: integrationPlanOutput?.integrationPlan,
      releasePlanSection: devopsReleaseOutput?.releasePlan,
      changelogSection: devopsReleaseOutput?.changelog,
    },
    { templateDir, aiTool: reporterTool },
  );

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "REPORTER",
    message: "Reporter agent completed",
  });

  await writeArtifact(join(paths.reportDir, "final-report.md"), reporterOutput.finalReport);
  artifacts.push(join(paths.reportDir, "final-report.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "final-report",
    message: "Final report generated",
  });

  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "Final Report",
    message: "Final Report completed",
  });

  if (input.slackConfig?.enabled && input.slackConfig.notifyOn.includes("report_ready")) {
    const slackInput: SlackMessageInput = {
      runTitle: input.requirement,
      runId,
      status: "REPORT_GENERATED",
    };
    const slackText = buildReportReadyMessage(slackInput);
    try {
      const { notifySlack } = await import("@aiteam/adapters");
      await notifySlack(input.slackConfig, "report_ready", slackText, true);
    } catch {
      // Slack notification is optional
    }
  }

  emitWorkflowProgress(runId, "WORKFLOW_COMPLETED", {
    message: "Workflow completed",
    status: "REPORT_GENERATED",
  });

  const memoryUsed = input.memoryContext
    ? {
        projectMemoryFiles: input.memoryContext.projectMemoryCount,
        decisionMemoryFiles: input.memoryContext.decisionMemoryCount,
        agentMemoryFiles: input.memoryContext.agentMemoryCount,
      }
    : undefined;

  return {
    runId,
    status: "REPORT_GENERATED",
    artifacts,
    createdAt,
    completedAt: nowIso(),
    memoryUsed,
  };
}
