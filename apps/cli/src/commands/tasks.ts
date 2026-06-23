import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { configSchema } from "@aiteam/shared";
import { getArtifactPaths, writeArtifact, runPmAgent } from "@aiteam/core";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createArtifactRepository,
} from "@aiteam/storage";

interface TasksOptions {
  run: string;
  regenerate?: boolean;
  format?: string;
}

export async function tasksCommand(options: TasksOptions): Promise<void> {
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
  const technicalDesign = await readReq(join(paths.designDir, "technical-design.md"));
  const acceptanceCriteria = await readReq(join(paths.requirementDir, "acceptance-criteria.md"));

  if (!technicalDesign) {
    console.log("❌ Technical design not found. Run 'aiteam plan' first.");
    db.close();
    process.exit(1);
  }

  const configPath = join(aiTeamDir, "config.json");
  const raw = await readFile(configPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  const config = configSchema.parse(parsed);

  const templateDir = join(aiTeamDir, "prompts");
  const tool = config.cli[config.agents.defaultPm].enabled
    ? {
        tool: config.agents.defaultPm,
        command: config.cli[config.agents.defaultPm].command,
        timeoutSeconds: config.cli[config.agents.defaultPm].timeoutSeconds,
      }
    : undefined;

  console.log(`📋 Generating task breakdown for run ${runId}...`);

  const pmOutput = await runPmAgent(
    {
      requirement: requirement || run.rawRequirement,
      technicalDesign,
      ...(acceptanceCriteria ? { acceptanceCriteria } : {}),
    },
    { templateDir, aiTool: tool },
  );

  await writeArtifact(join(paths.tasksDir, "task-breakdown.md"), pmOutput.taskBreakdownMd);
  await writeArtifact(join(paths.tasksDir, "task-breakdown.json"), pmOutput.taskBreakdownJson);
  if (pmOutput.jiraReadyMd) {
    await writeArtifact(join(paths.tasksDir, "jira-ready-tasks.md"), pmOutput.jiraReadyMd);
  }

  const artifactRepo = createArtifactRepository(db);
  const taskFiles: {
    name: string;
    path: string;
    type: "TASK_BREAKDOWN" | "JIRA_READY_TASKS";
    format: string;
  }[] = [
    {
      name: "task-breakdown.md",
      path: join(paths.tasksDir, "task-breakdown.md"),
      type: "TASK_BREAKDOWN",
      format: "markdown",
    },
    {
      name: "task-breakdown.json",
      path: join(paths.tasksDir, "task-breakdown.json"),
      type: "TASK_BREAKDOWN",
      format: "json",
    },
  ];

  if (pmOutput.jiraReadyMd) {
    taskFiles.push({
      name: "jira-ready-tasks.md",
      path: join(paths.tasksDir, "jira-ready-tasks.md"),
      type: "JIRA_READY_TASKS",
      format: "markdown",
    });
  }

  for (const file of taskFiles) {
    const artifactId = `${runId}_artifact_tasks_${file.name.replace(/\.(md|json)$/, "")}`;
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

  console.log(`✅ Task breakdown generated for run: ${runId}`);
  console.log(`   - ${join(paths.tasksDir, "task-breakdown.md")}`);
  console.log(`   - ${join(paths.tasksDir, "task-breakdown.json")}`);
  if (pmOutput.jiraReadyMd) {
    console.log(`   - ${join(paths.tasksDir, "jira-ready-tasks.md")}`);
  }

  if (options.format === "jira" && !pmOutput.jiraReadyMd) {
    console.log(
      "\n⚠️  Jira format requested but acceptance criteria not available for Jira enrichment.",
    );
  }

  db.close();
}
