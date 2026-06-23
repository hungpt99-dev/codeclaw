import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { configSchema } from "@aiteam/shared";
import type { AiCliTool } from "@aiteam/shared";
import { getArtifactPaths, writeArtifact, runDeveloperAgent } from "@aiteam/core";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createArtifactRepository,
} from "@aiteam/storage";

interface CodeOptions {
  run: string;
  agent?: string;
  promptOnly?: boolean;
  approve?: boolean;
  dryRun?: boolean;
}

export async function codeCommand(options: CodeOptions): Promise<void> {
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

  if (!clarifiedRequirement || !technicalDesign) {
    console.log("❌ Prerequisite artifacts not found. Run 'aiteam spec' and 'aiteam plan' first.");
    db.close();
    process.exit(1);
  }

  const configPath = join(aiTeamDir, "config.json");
  const raw = await readFile(configPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  const config = configSchema.parse(parsed);

  const templateDir = join(aiTeamDir, "prompts");
  const defaultAgent = (options.agent ?? config.agents.defaultDeveloper) as AiCliTool;
  const agentConfig = config.cli[defaultAgent];
  const tool = agentConfig.enabled
    ? {
        tool: defaultAgent,
        command: agentConfig.command,
        timeoutSeconds: agentConfig.timeoutSeconds,
      }
    : undefined;

  console.log(`📋 Generating implementation prompt for run ${runId}...`);

  const devOutput = await runDeveloperAgent(
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
    },
    { templateDir, aiTool: tool },
  );

  await writeArtifact(paths.implementationPromptPath, devOutput.implementationPrompt);

  const artifactRepo = createArtifactRepository(db);
  const promptArtifactId = `${runId}_artifact_code_implementation_prompt`;
  const existingPrompt = artifactRepo.findById(promptArtifactId);
  if (!existingPrompt) {
    artifactRepo.create({
      id: promptArtifactId,
      runId,
      type: "IMPLEMENTATION_PROMPT",
      name: "implementation-prompt.md",
      path: paths.implementationPromptPath,
      format: "markdown",
    });
  }

  runRepo.updateStatus(runId, "CODE_GENERATED");

  console.log(`✅ Implementation prompt generated for run: ${runId}`);
  console.log(`   - ${paths.implementationPromptPath}`);

  if (options.promptOnly) {
    console.log("\nℹ️  Prompt-only mode: code will not be executed.");
    console.log(`   Use the prompt at: ${paths.implementationPromptPath}`);
  }

  if (options.dryRun) {
    console.log("\nℹ️  Dry run: no execution commands were issued.");
  }

  if (tool && !options.promptOnly && !options.dryRun) {
    console.log(`\n🚀 Triggering ${defaultAgent} for implementation...`);
    console.log("   (Actual code execution not yet implemented in standalone mode.)");
    console.log(`   Prompt saved to: ${paths.implementationPromptPath}`);
    console.log(
      `   Use: aiteam run --mode semi-auto --agent ${defaultAgent} "${run.rawRequirement}"`,
    );
  }

  db.close();
}
