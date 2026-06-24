import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { configSchema } from "@codeclaw/shared";
import type { AiCliTool } from "@codeclaw/shared";
import {
  getArtifactPaths,
  writeArtifact,
  runDeveloperAgent,
  runCodingAgent,
  resolveProjectDir,
} from "@codeclaw/core";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createArtifactRepository,
} from "@codeclaw/storage";

interface CodeOptions {
  run: string;
  agent?: string;
  promptOnly?: boolean;
  approve?: boolean;
  dryRun?: boolean;
  project?: string;
}

export async function codeCommand(options: CodeOptions): Promise<void> {
  let aiTeamDir: string;

  try {
    const resolved = await resolveProjectDir(options.project);
    aiTeamDir = resolved.projectDir;
  } catch (err) {
    console.log(`❌ ${err instanceof Error ? err.message : String(err)}`);
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
  const codingPlanMd = await readReq(paths.codingPlanPath);

  if (!clarifiedRequirement || !technicalDesign) {
    console.log(
      "❌ Prerequisite artifacts not found. Run 'codeclaw spec' and 'codeclaw plan' first.",
    );
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
      codingPlanMd,
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
    db.close();
    return;
  }

  if (defaultAgent === "opencode" && tool && !options.dryRun) {
    if (!options.approve) {
      console.log("\n⏸️  OpenCode execution requires approval.");
      console.log(`   Review the prompt at: ${paths.implementationPromptPath}`);
      console.log(`   To approve: codeclaw code --run ${runId} --agent opencode --approve`);
      console.log(`   To dry-run: codeclaw code --run ${runId} --agent opencode --dry-run`);
      console.log(`   To skip:    codeclaw code --run ${runId} --agent opencode --prompt-only`);
      db.close();
      return;
    }

    console.log(`\n🚀 Triggering OpenCode CLI for implementation...`);

    const result = await runCodingAgent({
      runId,
      projectRoot: process.cwd(),
      prompt: devOutput.implementationPrompt,
      adapter: "opencode",
      dryRun: false,
      timeoutMs: agentConfig.timeoutSeconds * 1000,
    });

    runRepo.updateStatus(runId, result.runResult.success ? "CODE_GENERATED" : "CODE_FAILED");

    console.log(`   Execution report: ${result.reportPath}`);
    if (result.runResult.success) {
      console.log("✅ OpenCode execution completed successfully.");
    } else {
      console.log("❌ OpenCode execution failed.");
      if (result.runResult.stderr) {
        console.log(`   Error: ${result.runResult.stderr.slice(0, 500)}`);
      }
    }
  } else if (options.dryRun) {
    console.log("\nℹ️  Dry run: no execution commands were issued.");
    if (defaultAgent === "opencode") {
      console.log("   OpenCode execution would run with the generated prompt.");
    }
  } else if (tool) {
    console.log(`\n🚀 Triggering ${defaultAgent} for implementation...`);
    console.log("   (Actual code execution not yet implemented in standalone mode.)");
    console.log(`   Prompt saved to: ${paths.implementationPromptPath}`);
    console.log(
      `   Use: codeclaw run --mode semi-auto --agent ${defaultAgent} "${run.rawRequirement}"`,
    );
    console.log(
      `   Or try: codeclaw code --run ${runId} --agent opencode for OpenCode integration`,
    );
  }

  db.close();
}
