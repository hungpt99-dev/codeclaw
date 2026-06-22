import { join } from "node:path";
import { createRunId, nowIso } from "@aiteam/shared";
import { createArtifactDirs, writeArtifact } from "../artifacts/artifactWriter.js";
import { runBaAgent } from "../agents/baAgent.js";
import { runArchitectAgent } from "../agents/architectAgent.js";
import { runPmAgent } from "../agents/pmAgent.js";
import { runQaAgent } from "../agents/qaAgent.js";
import { runReporterAgent } from "../agents/reporterAgent.js";

export interface DocsOnlyWorkflowInput {
  requirement: string;
}

export interface DocsOnlyWorkflowOutput {
  runId: string;
  status: string;
  artifacts: string[];
  createdAt: string;
  completedAt: string;
}

export async function runDocsOnlyWorkflow(
  input: DocsOnlyWorkflowInput,
): Promise<DocsOnlyWorkflowOutput> {
  const runId = createRunId(input.requirement);
  const createdAt = nowIso();
  const paths = await createArtifactDirs(runId);
  const artifacts: string[] = [];

  await writeArtifact(paths.inputFile, `# Raw Requirement\n\n${input.requirement}\n`);
  artifacts.push(paths.inputFile);

  const baOutput = runBaAgent({ requirement: input.requirement });

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

  const architectOutput = runArchitectAgent({
    requirement: input.requirement,
    clarifiedRequirement: baOutput.clarifiedRequirement,
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

  const pmOutput = runPmAgent({
    requirement: input.requirement,
    technicalDesign: architectOutput.technicalDesign,
  });

  await writeArtifact(join(paths.tasksDir, "task-breakdown.md"), pmOutput.taskBreakdownMd);
  artifacts.push(join(paths.tasksDir, "task-breakdown.md"));

  await writeArtifact(join(paths.tasksDir, "task-breakdown.json"), pmOutput.taskBreakdownJson);
  artifacts.push(join(paths.tasksDir, "task-breakdown.json"));

  const qaOutput = runQaAgent({
    requirement: input.requirement,
    acceptanceCriteria: baOutput.acceptanceCriteria,
    taskBreakdownJson: pmOutput.taskBreakdownJson,
  });

  await writeArtifact(join(paths.testsDir, "test-matrix.md"), qaOutput.testMatrixMd);
  artifacts.push(join(paths.testsDir, "test-matrix.md"));

  await writeArtifact(join(paths.testsDir, "test-matrix.json"), qaOutput.testMatrixJson);
  artifacts.push(join(paths.testsDir, "test-matrix.json"));

  const reporterOutput = runReporterAgent({
    requirement: input.requirement,
    clarifiedRequirement: baOutput.clarifiedRequirement,
    businessRules: baOutput.businessRules,
    acceptanceCriteria: baOutput.acceptanceCriteria,
    technicalDesign: architectOutput.technicalDesign,
    apiDesign: architectOutput.apiDesign,
    dbDesign: architectOutput.dbDesign,
    taskBreakdownMd: pmOutput.taskBreakdownMd,
    testMatrixMd: qaOutput.testMatrixMd,
  });

  await writeArtifact(join(paths.reportDir, "final-report.md"), reporterOutput.finalReport);
  artifacts.push(join(paths.reportDir, "final-report.md"));

  return {
    runId,
    status: "REPORT_GENERATED",
    artifacts,
    createdAt,
    completedAt: nowIso(),
  };
}
