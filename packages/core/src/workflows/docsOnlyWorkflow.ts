import { join } from "node:path";
import { createRunId, nowIso } from "@codeclaw/shared";
import type { SlackIntegrationConfig } from "@codeclaw/shared";
import { createArtifactDirs, writeArtifact } from "../artifacts/artifactWriter.js";
import { runBaAgent } from "../agents/baAgent.js";
import { runPoAgent } from "../agents/poAgent.js";
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
import { runReporterAgent } from "../agents/reporterAgent.js";
import { runTechnicalDocumentationAgent } from "../agents/technicalDocumentationAgent.js";
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

export interface DocsOnlyWorkflowInput {
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
  slackConfig?: SlackIntegrationConfig;
  plannerSelection?: PlannerSelection;
  generateIntegrationPlan?: boolean;
  generateReleasePlan?: boolean;
  generateDocumentation?: boolean;
}

export interface DocsOnlyWorkflowOutput {
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

export async function runDocsOnlyWorkflow(
  input: DocsOnlyWorkflowInput,
): Promise<DocsOnlyWorkflowOutput> {
  const runId = createRunId(input.requirement);
  const createdAt = nowIso();
  const paths = await createArtifactDirs(runId);
  const artifacts: string[] = [];

  const templateDir = input.templateDir;

  const baTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("BA", input.agentMapping, input.cliConfigs)
      : undefined;

  const poTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs
      ? getAiToolConfig("PRODUCT_OWNER", input.agentMapping, input.cliConfigs)
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

  const techDocTool: AiToolConfig | undefined =
    input.agentMapping && input.cliConfigs && (input.generateDocumentation ?? false)
      ? getAiToolConfig("TECHNICAL_DOC", input.agentMapping, input.cliConfigs)
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
      "PO Scope Definition",
      "UX Research",
      "UI Design",
      "UX Writing",
      "Architecture Design",
      "Integration Planning",
      "Frontend Planning",
      "Backend Planning",
      "Task Breakdown",
      "Test Planning",
      "DevOps Release",
      "Traceability",
      "Technical Documentation",
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
    message: "Starting BA analysis",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "BA",
    message: "BA Agent is analyzing requirements",
  });

  const baOutput = await runBaAgent(
    { requirement: input.requirement },
    { templateDir, aiTool: baTool },
  );

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "BA",
    message: "BA Agent completed",
  });

  await writeArtifact(
    join(paths.requirementDir, "clarified-requirement.md"),
    baOutput.clarifiedRequirement,
  );
  artifacts.push(join(paths.requirementDir, "clarified-requirement.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "CLARIFIED_REQUIREMENT",
    message: "Clarified requirement generated",
  });

  await writeArtifact(join(paths.requirementDir, "business-rules.md"), baOutput.businessRules);
  artifacts.push(join(paths.requirementDir, "business-rules.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "BUSINESS_RULES",
    message: "Business rules generated",
  });

  await writeArtifact(
    join(paths.requirementDir, "acceptance-criteria.md"),
    baOutput.acceptanceCriteria,
  );
  artifacts.push(join(paths.requirementDir, "acceptance-criteria.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "ACCEPTANCE_CRITERIA",
    message: "Acceptance criteria generated",
  });

  await writeArtifact(join(paths.requirementDir, "open-questions.md"), baOutput.openQuestions);
  artifacts.push(join(paths.requirementDir, "open-questions.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "OPEN_QUESTIONS",
    message: "Open questions generated",
  });

  await writeArtifact(join(paths.requirementDir, "assumptions.md"), baOutput.assumptions);
  artifacts.push(join(paths.requirementDir, "assumptions.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "ASSUMPTIONS",
    message: "Assumptions generated",
  });

  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "BA Analysis",
    message: "BA analysis completed",
  });

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "PO Scope Definition",
    message: "Starting PO scope definition",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "PRODUCT_OWNER",
    message: "PO Agent is defining scope",
  });

  const poOutput = await runPoAgent(
    {
      clarifiedRequirement: baOutput.clarifiedRequirement,
      acceptanceCriteria: baOutput.acceptanceCriteria,
      openQuestions: baOutput.openQuestions,
      assumptions: baOutput.assumptions,
    },
    { templateDir, aiTool: poTool },
  );

  await writeArtifact(paths.scopeDefinitionPath, poOutput.productGoal);
  artifacts.push(paths.scopeDefinitionPath);

  await writeArtifact(join(paths.scopeDir, "mvp-scope.md"), poOutput.mvpScope);
  artifacts.push(join(paths.scopeDir, "mvp-scope.md"));

  await writeArtifact(paths.outOfScopePath, poOutput.outOfScope);
  artifacts.push(paths.outOfScopePath);

  await writeArtifact(paths.successCriteriaPath, poOutput.successCriteria);
  artifacts.push(paths.successCriteriaPath);
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "SCOPE_DEFINITION",
    message: "Scope definition generated",
  });

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "PRODUCT_OWNER",
    message: "PO Agent completed",
  });
  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "PO Scope Definition",
    message: "PO scope definition completed",
  });

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "UX Research",
    message: "Starting UX research",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "UX_RESEARCHER",
    message: "UX Researcher is analyzing user needs",
  });

  const userJourneyOutput = await runUserJourneyAgent(
    {
      requirement: input.requirement,
      clarifiedRequirement: baOutput.clarifiedRequirement,
      acceptanceCriteria: baOutput.acceptanceCriteria,
      scopeDefinition: poOutput.productGoal,
    },
    { templateDir, aiTool: uxResearcherTool },
  );

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "UX_RESEARCHER",
    message: "UX Researcher completed",
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
    artifactType: "UX_RESEARCH",
    message: "User journey artifacts generated",
  });

  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "UX Research",
    message: "UX research completed",
  });

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "UI Design",
    message: "Starting UI design",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "UI_DESIGNER",
    message: "UI Designer is designing UI",
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
    artifactType: "UI_DESIGN",
    message: "UI design artifacts generated",
  });

  await writeArtifact(
    paths.componentBreakdownPath,
    ["## Component Tree\n", uiDesignerOutput.componentTree].join("\n"),
  );
  artifacts.push(paths.componentBreakdownPath);

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "UI_DESIGNER",
    message: "UI Designer completed",
  });
  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "UI Design",
    message: "UI design completed",
  });

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "UX Writing",
    message: "Starting UX writing",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "UX_WRITER",
    message: "UX Writer is writing UX copy",
  });

  const uxWriterOutput = await runUxWriterAgent(
    {
      requirement: input.requirement,
      screenDescriptions: uiDesignerOutput.screenDescriptions,
      componentTree: uiDesignerOutput.componentTree,
    },
    { templateDir, aiTool: uxWriterTool },
  );

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
    artifactType: "UX_COPY",
    message: "UX copy artifacts generated",
  });

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "UX_WRITER",
    message: "UX Writer completed",
  });
  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "UX Writing",
    message: "UX writing completed",
  });

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "Architecture Design",
    message: "Starting architecture design",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "ARCHITECT",
    message: "Architect Agent is designing architecture",
  });

  const architectInput: Parameters<typeof runArchitectAgent>[0] = {
    requirement: input.requirement,
    clarifiedRequirement: baOutput.clarifiedRequirement,
    scopeDefinition: poOutput.productGoal,
    mvpScope: poOutput.mvpScope,
    successCriteria: poOutput.successCriteria,
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
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "TECHNICAL_DESIGN",
    message: "Technical design artifacts generated",
  });

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "ARCHITECT",
    message: "Architect Agent completed",
  });
  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "Architecture Design",
    message: "Architecture design completed",
  });

  let integrationPlanOutput: Awaited<ReturnType<typeof runIntegrationPlannerAgent>> | undefined;

  if (input.generateIntegrationPlan ?? false) {
    emitWorkflowProgress(runId, "STAGE_STARTED", {
      stage: "Integration Planning",
      message: "Starting integration planning",
    });
    emitWorkflowProgress(runId, "AGENT_STARTED", {
      agentRole: "INTEGRATION_PLANNER",
      message: "Integration Planner is planning integrations",
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
      message: "Integration Planner completed",
    });

    await writeArtifact(paths.integrationPlanPath, integrationPlanOutput.integrationPlan);
    artifacts.push(paths.integrationPlanPath);
    emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
      artifactType: "INTEGRATION_PLAN",
      message: "Integration plan generated",
    });
    emitWorkflowProgress(runId, "STAGE_COMPLETED", {
      stage: "Integration Planning",
      message: "Integration planning completed",
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
      message: "Starting frontend planning",
    });
    emitWorkflowProgress(runId, "AGENT_STARTED", {
      agentRole: "FRONTEND_PLANNER",
      message: "Frontend Planner is planning frontend",
    });

    frontendPlannerOutput = await runFrontendPlannerAgent(
      {
        requirement: input.requirement,
        clarifiedRequirement: baOutput.clarifiedRequirement,
        scopeDefinition: poOutput.productGoal,
        mvpScope: poOutput.mvpScope,
        successCriteria: poOutput.successCriteria,
        ...(repoAnalysis ? { repositoryAnalysis: repoAnalysis } : {}),
        userPersonas: userJourneyOutput.userPersonas,
        userFlows: userJourneyOutput.userFlows,
        screenDescriptions: uiDesignerOutput.screenDescriptions,
        componentBreakdown: uiDesignerOutput.componentTree,
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
    emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
      artifactType: "FRONTEND_PLAN",
      message: "Frontend design plan generated",
    });
    emitWorkflowProgress(runId, "AGENT_COMPLETED", {
      agentRole: "FRONTEND_PLANNER",
      message: "Frontend Planner completed",
    });
    emitWorkflowProgress(runId, "STAGE_COMPLETED", {
      stage: "Frontend Planning",
      message: "Frontend planning completed",
    });
  }

  if (plannerSelection.runBackend) {
    emitWorkflowProgress(runId, "STAGE_STARTED", {
      stage: "Backend Planning",
      message: "Starting backend planning",
    });
    emitWorkflowProgress(runId, "AGENT_STARTED", {
      agentRole: "BACKEND_PLANNER",
      message: "Backend Planner is planning backend",
    });

    backendPlannerOutput = await runBackendPlannerAgent(
      {
        requirement: input.requirement,
        clarifiedRequirement: baOutput.clarifiedRequirement,
        scopeDefinition: poOutput.productGoal,
        mvpScope: poOutput.mvpScope,
        successCriteria: poOutput.successCriteria,
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
    emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
      artifactType: "BACKEND_PLAN",
      message: "Backend design plan generated",
    });
    emitWorkflowProgress(runId, "AGENT_COMPLETED", {
      agentRole: "BACKEND_PLANNER",
      message: "Backend Planner completed",
    });
    emitWorkflowProgress(runId, "STAGE_COMPLETED", {
      stage: "Backend Planning",
      message: "Backend planning completed",
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
    message: "Starting task breakdown",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "PROJECT_MANAGER",
    message: "PM Agent is breaking down tasks",
  });

  const pmOutput = await runPmAgent(
    {
      requirement: input.requirement,
      technicalDesign: combinedDesign,
      acceptanceCriteria: baOutput.acceptanceCriteria,
    },
    { templateDir, aiTool: pmTool },
  );

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "PROJECT_MANAGER",
    message: "PM Agent completed",
  });

  await writeArtifact(join(paths.tasksDir, "task-breakdown.md"), pmOutput.taskBreakdownMd);
  artifacts.push(join(paths.tasksDir, "task-breakdown.md"));

  await writeArtifact(join(paths.tasksDir, "task-breakdown.json"), pmOutput.taskBreakdownJson);
  artifacts.push(join(paths.tasksDir, "task-breakdown.json"));

  if (pmOutput.jiraReadyMd) {
    await writeArtifact(join(paths.tasksDir, "jira-ready-tasks.md"), pmOutput.jiraReadyMd);
    artifacts.push(join(paths.tasksDir, "jira-ready-tasks.md"));
  }
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "TASK_BREAKDOWN",
    message: "Task breakdown generated",
  });
  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "Task Breakdown",
    message: "Task breakdown completed",
  });

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "Test Planning",
    message: "Starting test planning",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "QA",
    message: "QA Agent is planning tests",
  });

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
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "TEST_MATRIX",
    message: "Test matrix generated",
  });

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "QA",
    message: "QA Agent completed",
  });
  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "Test Planning",
    message: "Test planning completed",
  });

  let devopsReleaseOutput: Awaited<ReturnType<typeof runDevopsReleaseAgent>> | undefined;

  if (input.generateReleasePlan ?? false) {
    emitWorkflowProgress(runId, "STAGE_STARTED", {
      stage: "DevOps Release",
      message: "Starting DevOps release planning",
    });
    emitWorkflowProgress(runId, "AGENT_STARTED", {
      agentRole: "DEVOPS_RELEASE",
      message: "DevOps Release Agent is planning release",
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
      message: "DevOps Release Agent completed",
    });

    await writeArtifact(paths.releasePlanPath, devopsReleaseOutput.releasePlan);
    artifacts.push(paths.releasePlanPath);

    await writeArtifact(paths.changelogPath, devopsReleaseOutput.changelog);
    artifacts.push(paths.changelogPath);
    emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
      artifactType: "RELEASE_PLAN",
      message: "Release plan generated",
    });
    emitWorkflowProgress(runId, "STAGE_COMPLETED", {
      stage: "DevOps Release",
      message: "DevOps release planning completed",
    });
  }

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "Traceability",
    message: "Starting traceability generation",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "TRACEABILITY",
    message: "Traceability Agent is generating traceability",
  });

  const traceabilityOutput = await runTraceabilityAgent(
    { runId, artifactPaths: paths },
    { templateDir, aiTool: traceabilityTool },
  );

  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "TRACEABILITY",
    message: "Traceability Agent completed",
  });

  const traceabilityMd = traceabilityToEnhancedMarkdown(traceabilityOutput);
  await writeArtifact(paths.traceabilityMd, traceabilityMd);
  artifacts.push(paths.traceabilityMd);

  await writeArtifact(paths.traceabilityJson, JSON.stringify(traceabilityOutput.matrix, null, 2));
  artifacts.push(paths.traceabilityJson);
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "TRACEABILITY",
    message: "Traceability matrix generated",
  });
  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "Traceability",
    message: "Traceability generation completed",
  });

  const traceabilitySection = traceabilityMd;

  if (input.generateDocumentation ?? false) {
    emitWorkflowProgress(runId, "STAGE_STARTED", {
      stage: "Technical Documentation",
      message: "Starting technical documentation",
    });
    emitWorkflowProgress(runId, "AGENT_STARTED", {
      agentRole: "TECHNICAL_DOC",
      message: "Technical Documentation Agent is writing documentation",
    });

    const techDocOutput = await runTechnicalDocumentationAgent(
      {
        requirement: input.requirement,
        clarifiedRequirement: baOutput.clarifiedRequirement,
        acceptanceCriteria: baOutput.acceptanceCriteria,
        technicalDesign: combinedDesign,
        apiDesign: architectOutput.apiDesign,
        dbDesign: architectOutput.dbDesign,
        taskBreakdownMd: pmOutput.taskBreakdownMd,
        testMatrixMd: qaOutput.testMatrixMd,
        traceabilitySection,
        integrationPlanSection: integrationPlanOutput?.integrationPlan,
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
    emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
      artifactType: "TECHNICAL_DOC",
      message: "Technical documentation generated",
    });
    emitWorkflowProgress(runId, "AGENT_COMPLETED", {
      agentRole: "TECHNICAL_DOC",
      message: "Technical Documentation Agent completed",
    });
    emitWorkflowProgress(runId, "STAGE_COMPLETED", {
      stage: "Technical Documentation",
      message: "Technical documentation completed",
    });
  }

  emitWorkflowProgress(runId, "STAGE_STARTED", {
    stage: "Final Report",
    message: "Starting final report generation",
  });
  emitWorkflowProgress(runId, "AGENT_STARTED", {
    agentRole: "REPORTER",
    message: "Reporter Agent is generating final report",
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

  await writeArtifact(join(paths.reportDir, "final-report.md"), reporterOutput.finalReport);
  artifacts.push(join(paths.reportDir, "final-report.md"));
  emitWorkflowProgress(runId, "ARTIFACT_GENERATED", {
    artifactType: "FINAL_REPORT",
    message: "Final report generated",
  });
  emitWorkflowProgress(runId, "AGENT_COMPLETED", {
    agentRole: "REPORTER",
    message: "Reporter Agent completed",
  });
  emitWorkflowProgress(runId, "STAGE_COMPLETED", {
    stage: "Final Report",
    message: "Final report generation completed",
  });

  emitWorkflowProgress(runId, "WORKFLOW_COMPLETED", {
    message: "Workflow completed",
    status: "REPORT_GENERATED",
  });

  if (input.slackConfig?.enabled && input.slackConfig.notifyOn.includes("report_ready")) {
    const slackInput: SlackMessageInput = {
      runTitle: input.requirement,
      runId,
      status: "REPORT_GENERATED",
    };
    const slackText = buildReportReadyMessage(slackInput);
    try {
      const { notifySlack } = await import("@codeclaw/adapters");
      await notifySlack(input.slackConfig, "report_ready", slackText, true);
    } catch {
      // Slack notification is optional; failure should not fail the workflow
    }
  }

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
