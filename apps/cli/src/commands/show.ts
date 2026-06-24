import { join } from "node:path";
import { resolveProjectDir } from "@codeclaw/core";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createArtifactRepository,
} from "@codeclaw/storage";

export async function showCommand(runId: string, projectName?: string): Promise<void> {
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
  const artifactRepo = createArtifactRepository(db);

  const run = runRepo.findById(runId);

  if (!run) {
    console.log(`\n❌ Run not found: ${runId}\n`);
    db.close();
    process.exit(1);
  }

  const artifacts = artifactRepo.findByRunId(runId);
  db.close();

  console.log(`\n📋 Run: ${run.id}`);
  console.log(`   Title: ${run.title}`);
  console.log(`   Status: ${run.status}`);
  console.log(`   Mode: ${run.mode}`);
  console.log(`   Created: ${new Date(run.createdAt).toLocaleString()}`);
  console.log(`   Updated: ${new Date(run.updatedAt).toLocaleString()}`);
  console.log(`\n   Requirement:`);
  console.log(`   ${run.rawRequirement}`);

  if (artifacts.length > 0) {
    console.log(`\n📄 Artifacts (${String(artifacts.length)}):`);
    for (const artifact of artifacts) {
      console.log(`   - [${artifact.type}] ${artifact.path}`);
    }
  }

  console.log("");
}
