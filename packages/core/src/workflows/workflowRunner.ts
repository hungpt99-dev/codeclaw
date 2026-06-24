import { join } from "node:path";
import { createRunId, nowIso } from "@aiteam/shared";
import type { ApprovalGate, ApprovalStatus } from "@aiteam/shared";
import { createArtifactDirs, writeArtifact } from "../artifacts/artifactWriter.js";
import { runBaAgent } from "../agents/baAgent.js";
import { runPoAgent } from "../agents/poAgent.js";
import { runArchitectAgent } from "../agents/architectAgent.js";
import { runFrontendPlannerAgent } from "../agents/frontendPlannerAgent.js";
import { runBackendPlannerAgent } from "../agents/backendPlannerAgent.js";
import { runPmAgent } from "../agents/pmAgent.js";
import { runQaAgent } from "../agents/qaAgent.js";
import { runReporterAgent } from "../agents/reporterAgent.js";
import { getAiToolConfig, resolvePlannerSelection } from "./workflowHelpers.js";
import type { AiToolConfig, PlannerSelection } from "./workflowHelpers.js";

export type WorkflowPhase = "scope" | "requirement" | "plan" | "report";

export interface WorkflowGate {
  gate: ApprovalGate;
  status: ApprovalStatus;
  summary: string;
  artifacts: string[];
}

export interface WorkflowInput {
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
  approvedGate?: ApprovalGate;
  plannerSelection?: PlannerSelection;
}

export interface WorkflowResult {
  runId: string;
  status: string;
  artifacts: string[];
  createdAt: string;
  completedAt: string;
  pendingGate?: WorkflowGate;
  memoryUsed:
    | {
        projectMemoryFiles: number;
        decisionMemoryFiles: number;
        agentMemoryFiles: number;
      }
    | undefined;
}

export async function runWorkflowWithGates(input: WorkflowInput): Promise<WorkflowResult> {
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

  await writeArtifact(paths.inputFile, `# Raw Requirement\n\n${input.requirement}\n`);
  artifacts.push(paths.inputFile);

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

  const scopeArtifacts = artifacts.slice(1);
  const approvedGate: ApprovalGate | undefined = input.approvedGate;

  if (!approvedGate || approvedGate === "SCOPE") {
    if (!approvedGate) {
      const memoryUsed = input.memoryContext
        ? {
            projectMemoryFiles: input.memoryContext.projectMemoryCount,
            decisionMemoryFiles: input.memoryContext.decisionMemoryCount,
            agentMemoryFiles: input.memoryContext.agentMemoryCount,
          }
        : undefined;

      return {
        runId,
        status: "WAITING_FOR_SCOPE_APPROVAL",
        artifacts,
        createdAt,
        completedAt: nowIso(),
        pendingGate: {
          gate: "SCOPE",
          status: "PENDING",
          summary:
            "Review the generated scope artifacts (product goal, MVP scope, success criteria)",
          artifacts: scopeArtifacts,
        },
        memoryUsed,
      };
    }
  }

  const architectOutput = await runArchitectAgent(
    {
      requirement: input.requirement,
      clarifiedRequirement: baOutput.clarifiedRequirement,
    },
    { templateDir, aiTool: architectTool },
  );

  await writeArtifact(
    join(paths.designDir, "technical-design.md"),
    architectOutput.technicalDesign,
  );
  artifacts.push(join(paths.designDir, "technical-design.md"));

  await writeArtifact(join(paths.designDir, "api-design.md"), architectOutput.apiDesign);
  artifacts.push(join(paths.designDir, "api-design.md"));

  await writeArtifact(join(paths.designDir, "db-design.md"), architectOutput.dbDesign);
  artifacts.push(join(paths.designDir, "db-design.md"));

  const plannerSelection = resolvePlannerSelection(input.plannerSelection, undefined);

  let frontendPlannerOutput: Awaited<ReturnType<typeof runFrontendPlannerAgent>> | undefined;
  let backendPlannerOutput: Awaited<ReturnType<typeof runBackendPlannerAgent>> | undefined;

  if (plannerSelection.runFrontend) {
    frontendPlannerOutput = await runFrontendPlannerAgent(
      {
        requirement: input.requirement,
        clarifiedRequirement: baOutput.clarifiedRequirement,
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

  const planArtifacts = artifacts.slice(1 + scopeArtifacts.length);

  if (approvedGate === "SCOPE") {
    const memoryUsed = input.memoryContext
      ? {
          projectMemoryFiles: input.memoryContext.projectMemoryCount,
          decisionMemoryFiles: input.memoryContext.decisionMemoryCount,
          agentMemoryFiles: input.memoryContext.agentMemoryCount,
        }
      : undefined;

    return {
      runId,
      status: "WAITING_FOR_PLAN_APPROVAL",
      artifacts,
      createdAt,
      completedAt: nowIso(),
      pendingGate: {
        gate: "PLAN",
        status: "PENDING",
        summary: "Review the generated plan artifacts (design, tasks, tests)",
        artifacts: planArtifacts,
      },
      memoryUsed,
    };
  }

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

  return {
    runId,
    status: "REPORT_GENERATED",
    artifacts,
    createdAt,
    completedAt: nowIso(),
    memoryUsed,
  };
}
