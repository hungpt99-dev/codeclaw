import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { configSchema } from "@codeclaw/shared";
import { getArtifactPaths, writeArtifact, runArchitectAgent } from "@codeclaw/core";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createArtifactRepository,
} from "@codeclaw/storage";

interface PlanOptions {
  run: string;
  regenerate?: boolean;
  level?: string;
}

export async function planCommand(options: PlanOptions): Promise<void> {
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

  if (!requirement && !clarifiedRequirement) {
    console.log("❌ No requirement artifacts found. Run BA agent first.");
    db.close();
    process.exit(1);
  }

  const scopeDefinition = await readReq(paths.scopeDefinitionPath);
  const mvpScope = await readReq(join(paths.scopeDir, "mvp-scope.md"));
  const successCriteria = await readReq(paths.successCriteriaPath);

  const configPath = join(aiTeamDir, "config.json");
  const raw = await readFile(configPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  const config = configSchema.parse(parsed);

  const templateDir = join(aiTeamDir, "prompts");
  const tool = config.cli[config.agents.defaultArchitect].enabled
    ? {
        tool: config.agents.defaultArchitect,
        command: config.cli[config.agents.defaultArchitect].command,
        timeoutSeconds: config.cli[config.agents.defaultArchitect].timeoutSeconds,
      }
    : undefined;

  console.log(`📋 Generating technical design for run ${runId}...`);

  const architectOutput = await runArchitectAgent(
    {
      requirement: requirement || clarifiedRequirement,
      clarifiedRequirement,
      ...(scopeDefinition ? { scopeDefinition } : {}),
      ...(mvpScope ? { mvpScope } : {}),
      ...(successCriteria ? { successCriteria } : {}),
    },
    { templateDir, aiTool: tool },
  );

  await writeArtifact(
    join(paths.designDir, "technical-design.md"),
    architectOutput.technicalDesign,
  );
  await writeArtifact(join(paths.designDir, "api-design.md"), architectOutput.apiDesign);
  await writeArtifact(join(paths.designDir, "db-design.md"), architectOutput.dbDesign);

  const artifactRepo = createArtifactRepository(db);
  const planFiles = [
    {
      name: "technical-design.md",
      path: join(paths.designDir, "technical-design.md"),
      type: "TECHNICAL_DESIGN" as const,
    },
    {
      name: "api-design.md",
      path: join(paths.designDir, "api-design.md"),
      type: "API_DESIGN" as const,
    },
    {
      name: "db-design.md",
      path: join(paths.designDir, "db-design.md"),
      type: "DB_DESIGN" as const,
    },
  ];

  for (const file of planFiles) {
    const artifactId = `${runId}_artifact_plan_${file.name.replace(/\.md$/, "")}`;
    const existing = artifactRepo.findById(artifactId);
    if (!existing) {
      artifactRepo.create({
        id: artifactId,
        runId,
        type: file.type,
        name: file.name,
        path: file.path,
        format: "markdown",
      });
    }
  }

  runRepo.updateStatus(runId, "PLAN_GENERATED");

  console.log(`✅ Technical design generated for run: ${runId}`);
  console.log(`   - ${join(paths.designDir, "technical-design.md")}`);
  console.log(`   - ${join(paths.designDir, "api-design.md")}`);
  console.log(`   - ${join(paths.designDir, "db-design.md")}`);

  db.close();
}
