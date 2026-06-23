import { access } from "node:fs/promises";
import { join } from "node:path";
import { openDatabase, initializeSchema, createArtifactRepository } from "@aiteam/storage";

interface ArtifactsOptions {
  type?: string;
  json?: boolean;
}

export async function artifactsCommand(runId: string, options: ArtifactsOptions): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".ai-team");

  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .ai-team not found. Run 'aiteam init' first.");
    process.exit(1);
  }

  const db = openDatabase(join(aiTeamDir, "database.sqlite"));
  initializeSchema(db);
  const artifactRepo = createArtifactRepository(db);

  let artifacts = artifactRepo.findByRunId(runId);

  if (options.type) {
    const filterType = options.type.toUpperCase();
    artifacts = artifacts.filter((a) => a.type === filterType || a.type.includes(filterType));
  }

  db.close();

  if (options.json) {
    console.log(JSON.stringify({ runId, artifacts }, null, 2));
    return;
  }

  if (artifacts.length === 0) {
    console.log(`\n📄 No artifacts found for run: ${runId}\n`);
    return;
  }

  console.log(`\n📄 Artifacts for run: ${runId} (${String(artifacts.length)})\n`);
  for (const artifact of artifacts) {
    console.log(`  [${artifact.type}]`);
    console.log(`    Name: ${artifact.name}`);
    console.log(`    Path: ${artifact.path}`);
    console.log(`    Format: ${artifact.format}`);
    console.log(`    Created: ${new Date(artifact.createdAt).toLocaleString()}`);
    console.log("");
  }
}
