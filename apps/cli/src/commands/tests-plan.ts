import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { configSchema } from "@aiteam/shared";
import { getArtifactPaths, writeArtifact, runQaAgent } from "@aiteam/core";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createArtifactRepository,
} from "@aiteam/storage";

interface TestsPlanOptions {
  run: string;
  regenerate?: boolean;
  type?: string;
}

export async function testsPlanCommand(options: TestsPlanOptions): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".ai-team");

  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .ai-team not found. Run 'aiteam init' first.");
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
  const acceptanceCriteria = await readReq(join(paths.requirementDir, "acceptance-criteria.md"));
  const taskBreakdownJson = await readReq(join(paths.tasksDir, "task-breakdown.json"));

  if (!acceptanceCriteria) {
    console.log("❌ Acceptance criteria not found. Run 'aiteam spec' first.");
    db.close();
    process.exit(1);
  }

  if (!taskBreakdownJson) {
    console.log("❌ Task breakdown not found. Run 'aiteam tasks' first.");
    db.close();
    process.exit(1);
  }

  const configPath = join(aiTeamDir, "config.json");
  const raw = await readFile(configPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  const config = configSchema.parse(parsed);

  const templateDir = join(aiTeamDir, "prompts");
  const tool = config.cli[config.agents.defaultQa].enabled
    ? {
        tool: config.agents.defaultQa,
        command: config.cli[config.agents.defaultQa].command,
        timeoutSeconds: config.cli[config.agents.defaultQa].timeoutSeconds,
      }
    : undefined;

  console.log(`📋 Generating test matrix for run ${runId}...`);

  const qaOutput = await runQaAgent(
    {
      requirement: requirement || run.rawRequirement,
      acceptanceCriteria,
      taskBreakdownJson,
    },
    { templateDir, aiTool: tool },
  );

  await writeArtifact(join(paths.testsDir, "test-matrix.md"), qaOutput.testMatrixMd);
  await writeArtifact(join(paths.testsDir, "test-matrix.json"), qaOutput.testMatrixJson);

  const artifactRepo = createArtifactRepository(db);
  const testFiles = [
    {
      name: "test-matrix.md",
      path: join(paths.testsDir, "test-matrix.md"),
      type: "TEST_MATRIX" as const,
      format: "markdown",
    },
    {
      name: "test-matrix.json",
      path: join(paths.testsDir, "test-matrix.json"),
      type: "TEST_MATRIX" as const,
      format: "json",
    },
  ];

  for (const file of testFiles) {
    const artifactId = `${runId}_artifact_tests_${file.name.replace(/\.(md|json)$/, "")}`;
    const existing = artifactRepo.findById(artifactId);
    if (!existing) {
      artifactRepo.create({
        id: artifactId,
        runId,
        type: file.type,
        name: file.name,
        path: file.path,
        format: file.format,
      });
    }
  }

  console.log(`✅ Test matrix generated for run: ${runId}`);
  console.log(`   - ${join(paths.testsDir, "test-matrix.md")}`);
  console.log(`   - ${join(paths.testsDir, "test-matrix.json")}`);

  if (options.type && options.type !== "all") {
    console.log(`\nℹ️  Filtering to test type: ${options.type}`);
  }

  db.close();
}
