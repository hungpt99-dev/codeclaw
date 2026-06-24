import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { configSchema } from "@codeclaw/shared";
import { getArtifactPaths, writeArtifact, runBaAgent } from "@codeclaw/core";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createArtifactRepository,
} from "@codeclaw/storage";

interface SpecOptions {
  run: string;
  regenerate?: boolean;
  outputLanguage?: string;
}

export async function specCommand(options: SpecOptions): Promise<void> {
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

  let requirement: string;
  try {
    requirement = await readFile(paths.inputFile, "utf-8");
  } catch {
    try {
      requirement = await readFile(join(paths.requirementDir, "clarified-requirement.md"), "utf-8");
    } catch {
      console.log("❌ No requirement input found. Run 'codeclaw new' or 'codeclaw run' first.");
      db.close();
      process.exit(1);
    }
  }

  const configPath = join(aiTeamDir, "config.json");
  const raw = await readFile(configPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  const config = configSchema.parse(parsed);

  const templateDir = join(aiTeamDir, "prompts");
  const tool = config.cli[config.agents.defaultBa].enabled
    ? {
        tool: config.agents.defaultBa,
        command: config.cli[config.agents.defaultBa].command,
        timeoutSeconds: config.cli[config.agents.defaultBa].timeoutSeconds,
      }
    : undefined;

  console.log(`📋 Generating requirement specification for run ${runId}...`);

  const baOutput = await runBaAgent({ requirement }, { templateDir, aiTool: tool });

  await writeArtifact(
    join(paths.requirementDir, "clarified-requirement.md"),
    baOutput.clarifiedRequirement,
  );
  await writeArtifact(join(paths.requirementDir, "business-rules.md"), baOutput.businessRules);
  await writeArtifact(
    join(paths.requirementDir, "acceptance-criteria.md"),
    baOutput.acceptanceCriteria,
  );
  await writeArtifact(join(paths.requirementDir, "open-questions.md"), baOutput.openQuestions);
  await writeArtifact(join(paths.requirementDir, "assumptions.md"), baOutput.assumptions);

  const artifactRepo = createArtifactRepository(db);
  const specFiles = [
    {
      name: "clarified-requirement.md",
      path: join(paths.requirementDir, "clarified-requirement.md"),
      type: "CLARIFIED_REQUIREMENT" as const,
    },
    {
      name: "business-rules.md",
      path: join(paths.requirementDir, "business-rules.md"),
      type: "BUSINESS_RULES" as const,
    },
    {
      name: "acceptance-criteria.md",
      path: join(paths.requirementDir, "acceptance-criteria.md"),
      type: "ACCEPTANCE_CRITERIA" as const,
    },
    {
      name: "open-questions.md",
      path: join(paths.requirementDir, "open-questions.md"),
      type: "OPEN_QUESTIONS" as const,
    },
    {
      name: "assumptions.md",
      path: join(paths.requirementDir, "assumptions.md"),
      type: "ASSUMPTIONS" as const,
    },
  ];

  for (const file of specFiles) {
    const artifactId = `${runId}_artifact_spec_${file.name.replace(/\.md$/, "")}`;
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

  runRepo.updateStatus(runId, "SPEC_GENERATED");

  console.log(`✅ Requirement specification generated for run: ${runId}`);
  console.log(`   - ${join(paths.requirementDir, "clarified-requirement.md")}`);
  console.log(`   - ${join(paths.requirementDir, "business-rules.md")}`);
  console.log(`   - ${join(paths.requirementDir, "acceptance-criteria.md")}`);
  console.log(`   - ${join(paths.requirementDir, "open-questions.md")}`);
  console.log(`   - ${join(paths.requirementDir, "assumptions.md")}`);

  db.close();
}
