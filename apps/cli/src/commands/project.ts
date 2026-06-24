import { access } from "node:fs/promises";
import { resolve } from "node:path";
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
