import { join } from "node:path";
import { createRunId, nowIso } from "@aiteam/shared";
import type { ApprovalGate, ApprovalStatus } from "@aiteam/shared";
import { createArtifactDirs, writeArtifact } from "../artifacts/artifactWriter.js";
import { runBaAgent } from "../agents/baAgent.js";
import { runArchitectAgent } from "../agents/architectAgent.js";
import { runPmAgent } from "../agents/pmAgent.js";
import { runQaAgent } from "../agents/qaAgent.js";
import { runReporterAgent } from "../agents/reporterAgent.js";
import { getAiToolConfig } from "./workflowHelpers.js";
import type { AiToolConfig } from "./workflowHelpers.js";

export type WorkflowPhase = "requirement" | "plan" | "report";

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

  const requirementArtifacts = artifacts.slice(1);
  const approvedGate: ApprovalGate | undefined = input.approvedGate;

  if (!approvedGate || approvedGate === "REQUIREMENT") {
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
        status: "WAITING_FOR_REQUIREMENT_APPROVAL",
        artifacts,
        createdAt,
        completedAt: nowIso(),
        pendingGate: {
          gate: "REQUIREMENT",
          status: "PENDING",
          summary: "Review the generated requirement artifacts",
          artifacts: requirementArtifacts,
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

  const planArtifacts = artifacts.slice(1 + requirementArtifacts.length);

  if (approvedGate === "REQUIREMENT") {
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
      technicalDesign: architectOutput.technicalDesign,
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
