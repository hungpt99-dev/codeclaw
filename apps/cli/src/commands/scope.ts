import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { configSchema } from "@aiteam/shared";
import { getArtifactPaths, writeArtifact, runPoAgent } from "@aiteam/core";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createArtifactRepository,
} from "@aiteam/storage";

interface ScopeOptions {
  run: string;
  strict?: boolean;
  regenerate?: boolean;
}

export async function scopeCommand(options: ScopeOptions): Promise<void> {
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

  const reqFiles = {
    clarifiedRequirement: join(paths.requirementDir, "clarified-requirement.md"),
    acceptanceCriteria: join(paths.requirementDir, "acceptance-criteria.md"),
    openQuestions: join(paths.requirementDir, "open-questions.md"),
    assumptions: join(paths.requirementDir, "assumptions.md"),
  };

  try {
    await access(reqFiles.clarifiedRequirement);
  } catch {
    console.log("❌ Requirement artifacts not found. Run BA agent first.");
    db.close();
    process.exit(1);
  }

  const readReq = async (filePath: string): Promise<string> => {
    try {
      return await readFile(filePath, "utf-8");
    } catch {
      return "";
    }
  };

  const clarifiedRequirement = await readReq(reqFiles.clarifiedRequirement);
  const acceptanceCriteria = await readReq(reqFiles.acceptanceCriteria);
  const openQuestions = await readReq(reqFiles.openQuestions);
  const assumptions = await readReq(reqFiles.assumptions);

  const configPath = join(aiTeamDir, "config.json");
  const raw = await readFile(configPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  const config = configSchema.parse(parsed);

  const templateDir = join(aiTeamDir, "prompts");
  const poTool = config.cli[config.agents.defaultPo].enabled
    ? {
        tool: config.agents.defaultPo,
        command: config.cli[config.agents.defaultPo].command,
        timeoutSeconds: config.cli[config.agents.defaultPo].timeoutSeconds,
      }
    : undefined;

  console.log(`📋 Generating scope for run ${runId}...`);

  const poOutput = await runPoAgent(
    {
      clarifiedRequirement,
      acceptanceCriteria,
      openQuestions,
      assumptions,
    },
    { templateDir, aiTool: poTool },
  );

  await writeArtifact(paths.scopeDefinitionPath, poOutput.productGoal);
  await writeArtifact(join(paths.scopeDir, "mvp-scope.md"), poOutput.mvpScope);
  await writeArtifact(paths.outOfScopePath, poOutput.outOfScope);
  await writeArtifact(paths.successCriteriaPath, poOutput.successCriteria);

  const artifactRepo = createArtifactRepository(db);
  const scopeFiles = [
    { name: "product-goal.md", path: paths.scopeDefinitionPath },
    { name: "mvp-scope.md", path: join(paths.scopeDir, "mvp-scope.md") },
    { name: "out-of-scope.md", path: paths.outOfScopePath },
    { name: "success-criteria.md", path: paths.successCriteriaPath },
  ];

  for (const file of scopeFiles) {
    const artifactId = `${runId}_artifact_scope_${file.name.replace(/\.md$/, "")}`;
    const existing = artifactRepo.findById(artifactId);
    if (!existing) {
      artifactRepo.create({
        id: artifactId,
        runId,
        type: "SCOPE_DEFINITION",
        name: file.name,
        path: file.path,
        format: "markdown",
      });
    }
  }

  console.log(`✅ Scope definition generated for run: ${runId}`);
  console.log(`   - ${paths.scopeDefinitionPath}`);
  console.log(`   - ${join(paths.scopeDir, "mvp-scope.md")}`);
  console.log(`   - ${paths.outOfScopePath}`);
  console.log(`   - ${paths.successCriteriaPath}`);

  if (options.strict) {
    console.log("\n⚠️  Strict mode: scope approval is required before proceeding.");
  }

  db.close();
}
