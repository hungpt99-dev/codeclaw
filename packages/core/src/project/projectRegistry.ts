import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { createRunId } from "@codeclaw/shared";
import type { ProjectRegistry, ProjectRegistryEntry } from "@codeclaw/shared";

const CODECLAW_HOME = process.env.CODECLAW_HOME ?? join(homedir(), ".codeclaw");
const REGISTRY_PATH = join(CODECLAW_HOME, "projects.json");

function emptyRegistry(): ProjectRegistry {
  return { version: 1, projects: [], activeProjectId: null };
}

export async function loadRegistry(): Promise<ProjectRegistry> {
  try {
    const raw = await readFile(REGISTRY_PATH, "utf-8");
    const rawParsed: unknown = JSON.parse(raw);
    if (
      typeof rawParsed === "object" &&
      rawParsed !== null &&
      Array.isArray((rawParsed as Record<string, unknown>).projects)
    ) {
      return rawParsed as ProjectRegistry;
    }
    return emptyRegistry();
  } catch {
    return emptyRegistry();
  }
}

export async function saveRegistry(registry: ProjectRegistry): Promise<void> {
  await mkdir(CODECLAW_HOME, { recursive: true });
  await writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf-8");
}

export async function addProject(name: string, rootPath: string): Promise<ProjectRegistryEntry> {
  const registry = await loadRegistry();

  const existing = registry.projects.find((p) => p.name === name || p.rootPath === rootPath);
  if (existing) {
    throw new Error(`Project "${existing.name}" already exists at ${existing.rootPath}`);
  }

  const now = new Date().toISOString();
  const entry: ProjectRegistryEntry = {
    id: `proj_${createRunId(name).slice(0, 12)}`,
    name,
    rootPath,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
  };

  registry.projects.push(entry);
  await saveRegistry(registry);
  return entry;
}

export async function listProjects(): Promise<ProjectRegistryEntry[]> {
  const registry = await loadRegistry();
  return [...registry.projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function findProject(nameOrId: string): Promise<ProjectRegistryEntry | undefined> {
  const registry = await loadRegistry();
  return registry.projects.find((p) => p.name === nameOrId || p.id === nameOrId);
}

export async function setActiveProject(
  nameOrId: string,
): Promise<ProjectRegistryEntry | undefined> {
  const registry = await loadRegistry();
  const project = registry.projects.find((p) => p.name === nameOrId || p.id === nameOrId);
  if (!project) return undefined;

  registry.activeProjectId = project.id;
  project.lastUsedAt = new Date().toISOString();
  await saveRegistry(registry);
  return project;
}

export async function getActiveProject(): Promise<ProjectRegistryEntry | undefined> {
  const registry = await loadRegistry();
  if (!registry.activeProjectId) return undefined;
  return registry.projects.find((p) => p.id === registry.activeProjectId);
}

export async function removeProject(nameOrId: string): Promise<boolean> {
  const registry = await loadRegistry();
  const index = registry.projects.findIndex((p) => p.name === nameOrId || p.id === nameOrId);
  if (index === -1) return false;

  const removed = registry.projects[index];
  if (!removed) return false;
  registry.projects.splice(index, 1);

  if (registry.activeProjectId === removed.id) {
    registry.activeProjectId = null;
  }

  await saveRegistry(registry);
  return true;
}

export async function updateProjectTimestamp(nameOrId: string): Promise<void> {
  const registry = await loadRegistry();
  const project = registry.projects.find((p) => p.name === nameOrId || p.id === nameOrId);
  if (project) {
    project.lastUsedAt = new Date().toISOString();
    project.updatedAt = new Date().toISOString();
    await saveRegistry(registry);
  }
}

export async function isProjectDirectory(rootPath: string): Promise<boolean> {
  try {
    await access(join(rootPath, ".codeclaw"));
    return true;
  } catch {
    return false;
  }
}
