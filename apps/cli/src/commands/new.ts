import { access } from "node:fs/promises";
import { join } from "node:path";
import { createRunId } from "@codeclaw/shared";
import { createArtifactDirs, writeArtifact } from "@codeclaw/core";
import { openDatabase, initializeSchema, createRunRepository } from "@codeclaw/storage";

interface NewOptions {
  title?: string;
  mode?: string;
}

export async function newCommand(requirement: string, options: NewOptions): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".codeclaw");

  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .codeclaw not found. Run 'codeclaw init' first.");
    process.exit(1);
  }

  const runId = createRunId(requirement);
  const title = options.title ?? requirement.slice(0, 80);

  const paths = await createArtifactDirs(runId);

  await writeArtifact(paths.inputFile, requirement);

  const db = openDatabase(join(aiTeamDir, "database.sqlite"));
  initializeSchema(db);

  const runRepo = createRunRepository(db);
  const mode = (options.mode ?? "docs-only") as
    | "docs-only"
    | "assisted"
    | "semi-auto"
    | "multi-agent";

  runRepo.create({
    id: runId,
    title,
    rawRequirement: requirement,
    mode,
    outputLanguage: "English",
  });

  db.close();

  console.log(`✅ New run created: ${runId}`);
  console.log(`\nNext: codeclaw spec --run ${runId}`);
}
