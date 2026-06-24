import { access } from "node:fs/promises";
import { join } from "node:path";
import { openDatabase, initializeSchema, createRunRepository } from "@codeclaw/storage";

export async function listCommand(): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".codeclaw");

  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .codeclaw not found. Run 'codeclaw init' first.");
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
