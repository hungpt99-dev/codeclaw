import { access, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { openDatabase, initializeSchema, createRunRepository, createStepExecutionRepository, createArtifactRepository, createApprovalRepository, createWorkflowTemplateRepository } from "@codeclaw/storage";
import {
  addProject,
  listProjects,
  findProject,
  setActiveProject,
  getActiveProject,
  removeProject,
} from "@codeclaw/core";

export async function addProjectCommand(
  rootPath: string,
  options: { name?: string },
): Promise<void> {
  const resolvedPath = resolve(rootPath);

  try {
    await access(resolvedPath);
  } catch {
    console.log(`❌ Path does not exist: ${resolvedPath}`);
    process.exit(1);
  }

  const codeclawDir = await import("node:fs/promises").then((fs) =>
    fs
      .access(resolve(resolvedPath, ".codeclaw"))
      .then(() => true)
      .catch(() => false),
  );
  if (!codeclawDir) {
    console.log(
      `⚠️  No .codeclaw directory found at ${resolvedPath}. Run 'codeclaw init' there first.`,
    );
  }

  const name = options.name ?? resolvedPath.split("/").pop() ?? "unnamed";

  try {
    const entry = await addProject(name, resolvedPath);
    console.log(`✅ Project "${entry.name}" added (${entry.id})`);
  } catch (err) {
    console.log(`❌ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

export async function listProjectsCommand(options: { json?: boolean }): Promise<void> {
  const projects = await listProjects();

  if (options.json) {
    console.log(JSON.stringify(projects, null, 2));
    return;
  }

  const active = await getActiveProject();

  if (projects.length === 0) {
    console.log("\n📋 No projects registered.");
    console.log("   Add one with: codeclaw project add <path> [--name <name>]\n");
    return;
  }

  console.log("\n📋 Registered projects:\n");
  for (const p of projects) {
    const isActive = active?.id === p.id ? " *" : "  ";
    const lastUsed = p.lastUsedAt
      ? `last used ${new Date(p.lastUsedAt).toLocaleDateString()}`
      : "never used";
    console.log(`  ${isActive} ${p.name} (${p.id})`);
    console.log(`     Path: ${p.rootPath}`);
    console.log(`     ${lastUsed}`);
    console.log("");
  }
  if (active) {
    console.log("  * = active project\n");
  }
}

export async function useProjectCommand(nameOrId: string): Promise<void> {
  const project = await setActiveProject(nameOrId);
  if (!project) {
    console.log(`❌ Project "${nameOrId}" not found.`);
    process.exit(1);
  }
  console.log(`✅ Active project set to "${project.name}" (${project.rootPath})`);
}

export async function currentProjectCommand(): Promise<void> {
  const active = await getActiveProject();
  if (!active) {
    console.log("\n📋 No active project.\n");
    return;
  }
  console.log(`\n📋 Active project: ${active.name}`);
  console.log(`   ID: ${active.id}`);
  console.log(`   Path: ${active.rootPath}`);
  console.log(`   Added: ${new Date(active.createdAt).toLocaleDateString()}`);
  console.log("");
}

export async function removeProjectCommand(nameOrId: string): Promise<void> {
  const project = await findProject(nameOrId);
  if (!project) {
    console.log(`❌ Project "${nameOrId}" not found.`);
    process.exit(1);
  }

  const removed = await removeProject(nameOrId);
  if (removed) {
    console.log(`✅ Project "${project.name}" removed from registry.`);
    console.log("   Note: This does NOT delete the project files or .codeclaw directory.");
  } else {
    console.log(`❌ Could not remove project "${nameOrId}".`);
    process.exit(1);
  }
}

interface MigrateRunsOptions {
  project?: string;
  dryRun?: boolean;
  yes?: boolean;
  fromLegacyDb?: string;
  onlyRun?: string;
}

export async function migrateRunsCommand(options: MigrateRunsOptions): Promise<void> {
  // Resolve target project
  const projectNameOrId = options.project;
  if (!projectNameOrId) {
    console.log("❌ --project <name-or-id> is required");
    process.exit(1);
  }

  const project = await findProject(projectNameOrId);
  if (!project) {
    console.log(`❌ Project "${projectNameOrId}" not found.`);
    process.exit(1);
  }

  const projectRoot = project.rootPath;
  const projectCodeclawDir = join(projectRoot, ".codeclaw");
  const projectDbPath = join(projectCodeclawDir, "database.sqlite");

  // Check project .codeclaw exists
  try {
    await access(projectCodeclawDir);
    await access(projectDbPath);
  } catch {
    console.log(`❌ Project "${project.name}" exists but no .codeclaw/database.sqlite found.`);
    console.log(`   Run 'codeclaw init' in ${projectRoot} first.`);
    process.exit(1);
  }

  // Determine legacy DB path
  const legacyDbPath = options.fromLegacyDb ?? join(process.cwd(), ".codeclaw", "database.sqlite");
  let legacyDbExists = false;
  try {
    await access(legacyDbPath);
    legacyDbExists = true;
  } catch {
    // try cwd
  }

  if (!legacyDbExists) {
    console.log(`❌ Legacy database not found at: ${legacyDbPath}`);
    console.log("   Use --from-legacy-db <path> to specify a different path.");
    process.exit(1);
  }

  // Open both databases
  const legacyDb = openDatabase(legacyDbPath);
  initializeSchema(legacyDb);
  const projectDb = openDatabase(projectDbPath);
  initializeSchema(projectDb);

  const legacyRunRepo = createRunRepository(legacyDb);
  const projectRunRepo = createRunRepository(projectDb);

  // Find unassigned runs (project_id IS NULL) or specific run
  let legacyRuns = legacyRunRepo.findAll().filter((r) => !r.projectId);
  if (options.onlyRun) {
    legacyRuns = legacyRuns.filter((r) => r.id === options.onlyRun);
  }

  if (legacyRuns.length === 0) {
    console.log("\n📋 No unassigned legacy runs found.");
    legacyDb.close();
    projectDb.close();
    return;
  }

  // Dry-run report
  console.log(`\n📋 Migration Report (${options.dryRun ? "DRY RUN" : "LIVE"}):`);
  console.log(`   Target project: ${project.name} (${project.id})`);
  console.log(`   Project root: ${projectRoot}`);
  console.log(`   Project database: ${projectDbPath}`);
  console.log(`   Legacy database: ${legacyDbPath}`);
  console.log(`   Unassigned runs found: ${legacyRuns.length}\n`);

  for (const run of legacyRuns) {
    console.log(`   Run: ${run.id}`);
    console.log(`     Title: ${run.title}`);
    console.log(`     Status: ${run.status}`);
    console.log(`     Created: ${run.createdAt}`);

    // Check if run already exists in project DB
    const existingInTarget = projectRunRepo.findById(run.id);
    if (existingInTarget) {
      console.log(`     ⏭ Already exists in target, skipping`);
      continue;
    }

    // Count steps
    const stepRepo = createStepExecutionRepository(legacyDb);
    const steps = stepRepo.findByRunId(run.id);
    console.log(`     Steps: ${steps.length}`);

    // Count artifacts
    const artifactRepo = createArtifactRepository(legacyDb);
    const artifacts = artifactRepo.findByRunId(run.id);
    console.log(`     Artifacts: ${artifacts.length}`);
    console.log("");
  }

  if (options.dryRun) {
    console.log("   This was a dry run. No data was modified.");
    console.log("   Run with --yes to execute the migration.\n");
    legacyDb.close();
    projectDb.close();
    return;
  }

  // Require explicit confirmation
  if (!options.yes) {
    console.log("   Use --yes to confirm migration.\n");
    legacyDb.close();
    projectDb.close();
    return;
  }

  // Execute migration
  let copied = 0;
  let skipped = 0;

  for (const run of legacyRuns) {
    const existingInTarget = projectRunRepo.findById(run.id);
    if (existingInTarget) {
      skipped++;
      continue;
    }

    // Copy run with project_id set
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (projectRunRepo.create as any)({
      id: run.id,
      title: run.title,
      rawRequirement: run.rawRequirement,
      mode: run.mode,
      outputLanguage: run.outputLanguage,
      projectId: project.id,
      workflowTemplateId: run.workflowTemplateId,
      workflowMode: run.workflowMode,
    });

    // Copy status
    projectRunRepo.updateStatus(run.id, run.status);

    // Copy steps
    const stepRepo = createStepExecutionRepository(legacyDb);
    const steps = stepRepo.findByRunId(run.id);
    const projectStepRepo = createStepExecutionRepository(projectDb);
    for (const step of steps) {
      try {
        projectStepRepo.create({
          id: step.id,
          runId: step.runId,
          stepIndex: step.stepIndex,
          stepName: step.stepName,
          agentRole: step.agentRole,
        });
        if (step.startedAt) projectStepRepo.updateStartedAt(step.id);
        if (step.endedAt) {
          projectStepRepo.updateComplete(
            step.id,
            step.status === "COMPLETED" ? "COMPLETED" : "FAILED",
            step.durationMs ?? 0,
            step.errorMessage,
            step.outputArtifactPath,
          );
        }
      } catch {
        // Skip if step already exists
      }
    }

    // Copy artifacts metadata
    const artifactRepo = createArtifactRepository(legacyDb);
    const artifacts = artifactRepo.findByRunId(run.id);
    const projectArtifactRepo = createArtifactRepository(projectDb);
    for (const art of artifacts) {
      try {
        projectArtifactRepo.create({
          id: art.id,
          runId: art.runId,
          type: art.type,
          name: art.name,
          path: art.path,
          format: art.format,
        });
      } catch {
        // Skip if artifact already exists
      }
    }

    copied++;
  }

  legacyDb.close();
  projectDb.close();

  console.log(`\n✅ Migration complete:`);
  console.log(`   Copied: ${copied} run(s)`);
  console.log(`   Skipped (already existed): ${skipped}`);
  console.log(`   Legacy database was NOT modified.\n`);
}
