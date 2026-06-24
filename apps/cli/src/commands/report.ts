import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { configSchema } from "@codeclaw/shared";
import { getArtifactPaths, writeArtifact, runReporterAgent } from "@codeclaw/core";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createArtifactRepository,
} from "@codeclaw/storage";

interface ReportOptions {
  run: string;
  regenerate?: boolean;
  includeLogs?: boolean;
  format?: string;
}

export async function reportCommand(options: ReportOptions): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".codeclaw");

  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .codeclaw not found. Run 'codeclaw init' first.");
    process.exit(1);
  }

  const runId = options.run;
  const db = openDatabase(join(aiTeamDir, "database.sqlite"));
  initializeSchema(db);

  const runRepo = createRunRepository(db);
  const run = runRepo.findById(runId);

  if (!run) {
    console.log(`❌ Run not found: ${runId}`);
    db.close();
    process.exit(1);
  }

  const paths = getArtifactPaths(runId);

  const readReq = async (filePath: string): Promise<string> => {
    try {
      return await readFile(filePath, "utf-8");
    } catch {
      return "";
    }
  };

  const requirement = await readReq(paths.inputFile);
  const clarifiedRequirement = await readReq(
    join(paths.requirementDir, "clarified-requirement.md"),
  );
  const businessRules = await readReq(join(paths.requirementDir, "business-rules.md"));
  const acceptanceCriteria = await readReq(join(paths.requirementDir, "acceptance-criteria.md"));
  const technicalDesign = await readReq(join(paths.designDir, "technical-design.md"));
  const apiDesign = await readReq(join(paths.designDir, "api-design.md"));
  const dbDesign = await readReq(join(paths.designDir, "db-design.md"));
  const taskBreakdownMd = await readReq(join(paths.tasksDir, "task-breakdown.md"));
  const testMatrixMd = await readReq(join(paths.testsDir, "test-matrix.md"));
  const traceabilitySection = await readReq(join(paths.reportDir, "traceability.md"));

  const configPath = join(aiTeamDir, "config.json");
  const raw = await readFile(configPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  const config = configSchema.parse(parsed);

  const templateDir = join(aiTeamDir, "prompts");
  const tool = config.cli[config.agents.defaultReporter].enabled
    ? {
        tool: config.agents.defaultReporter,
        command: config.cli[config.agents.defaultReporter].command,
        timeoutSeconds: config.cli[config.agents.defaultReporter].timeoutSeconds,
      }
    : undefined;

  console.log(`📋 Generating final report for run ${runId}...`);

  const reporterOutput = await runReporterAgent(
    {
      requirement: requirement || run.rawRequirement,
      clarifiedRequirement,
      businessRules,
      acceptanceCriteria,
      technicalDesign,
      apiDesign,
      dbDesign,
      taskBreakdownMd,
      testMatrixMd,
      ...(traceabilitySection ? { traceabilitySection } : {}),
    },
    { templateDir, aiTool: tool },
  );

  await writeArtifact(join(paths.reportDir, "final-report.md"), reporterOutput.finalReport);

  const artifactRepo = createArtifactRepository(db);
  const reportArtifactId = `${runId}_artifact_report_final_report`;
  const existing = artifactRepo.findById(reportArtifactId);
  if (!existing) {
    artifactRepo.create({
      id: reportArtifactId,
      runId,
      type: "FINAL_REPORT",
      name: "final-report.md",
      path: join(paths.reportDir, "final-report.md"),
      format: "markdown",
    });
  }

  runRepo.updateStatus(runId, "REPORT_GENERATED");

  console.log(`✅ Final report generated for run: ${runId}`);
  console.log(`   - ${join(paths.reportDir, "final-report.md")}`);

  if (options.includeLogs) {
    console.log(`   - ${paths.logsDir} (logs included)`);
  }

  db.close();
}
