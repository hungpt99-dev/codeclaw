import { join } from "node:path";
import { resolveProjectDir } from "@codeclaw/core";
import { openDatabase, initializeSchema, createRunRepository } from "@codeclaw/storage";

export async function listCommand(projectName?: string): Promise<void> {
  let aiTeamDir: string;

  try {
    const resolved = await resolveProjectDir(projectName);
    aiTeamDir = resolved.projectDir;
  } catch (err) {
    console.log(`❌ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const db = openDatabase(join(aiTeamDir, "database.sqlite"));
  initializeSchema(db);
  const runRepo = createRunRepository(db);
  const runs = runRepo.findRecent(20);
  db.close();

  if (runs.length === 0) {
    console.log("\n📋 No runs found.\n");
    return;
  }

  console.log("\n📋 Recent runs:\n");
  for (const run of runs) {
    const date = new Date(run.createdAt).toLocaleString();
    console.log(`  ${run.id}`);
    console.log(`    Title: ${run.title}`);
    console.log(`    Status: ${run.status}`);
    console.log(`    Mode: ${run.mode}`);
    console.log(`    Created: ${date}`);
    console.log("");
  }
}
