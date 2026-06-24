import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { nowIso } from "@codeclaw/shared";
import type { MemoryScope, MemoryItem, RuntimeMemoryContext } from "@codeclaw/shared";
import { openDatabase, initializeSchema, createMemoryRepository } from "@codeclaw/storage";
import type { MemoryItemRecord } from "@codeclaw/storage";
import {
  getMemoryDir,
  getProjectMemoryDir,
  getDecisionMemoryDir,
  getAgentMemoryDir,
  getIndexesDir,
  getDatabasePath,
} from "./memoryPaths.js";
import { DEFAULT_MEMORY_FILES } from "./memoryDefaults.js";
import type {
  InitializeRuntimeMemoryOptions,
  LoadRuntimeMemoryContextOptions,
  MemoryInitializationResult,
  MemoryStatus,
} from "./memoryTypes.js";

function recordToMemoryItem(record: MemoryItemRecord): MemoryItem {
  return {
    id: record.id,
    scope: record.scope,
    title: record.title,
    path: record.path,
    format: record.format,
    tags: record.tags,
    summary: record.summary ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function dirExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function initializeRuntimeMemory(
  options: InitializeRuntimeMemoryOptions,
): Promise<MemoryInitializationResult> {
  const memoryDir = getMemoryDir(options.projectRoot);
  const filesCreated: string[] = [];
  const filesSkipped: string[] = [];

  const dirs = [
    memoryDir,
    getProjectMemoryDir(options.projectRoot),
    getDecisionMemoryDir(options.projectRoot),
    getAgentMemoryDir(options.projectRoot),
    getIndexesDir(options.projectRoot),
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }

  for (const [relativePath, def] of Object.entries(DEFAULT_MEMORY_FILES)) {
    const fullPath = join(memoryDir, relativePath);
    const parentDir = join(fullPath, "..");
    await mkdir(parentDir, { recursive: true });

    const exists = await dirExists(fullPath);
    if (exists && !options.force) {
      filesSkipped.push(relativePath);
      continue;
    }

    await writeFile(fullPath, def.content, "utf-8");
    filesCreated.push(relativePath);
  }

  const db = openDatabase(getDatabasePath(options.projectRoot));
  initializeSchema(db);
  const repo = createMemoryRepository(db);

  let itemsIndexed = 0;
  for (const [relativePath, def] of Object.entries(DEFAULT_MEMORY_FILES)) {
    const fullPath = join(memoryDir, relativePath);
    const exists = await dirExists(fullPath);
    if (!exists) continue;

    const id = `mem_${def.scope}_${relativePath.replace(/\//g, "_").replace(/\./g, "_")}`;
    repo.upsert({
      id,
      scope: def.scope,
      title: def.title,
      path: fullPath,
      format: def.format,
      tags: def.tags,
    });
    itemsIndexed++;
  }

  db.close();

  return {
    memoryDir,
    filesCreated,
    filesSkipped,
    itemsIndexed,
  };
}

export function loadRuntimeMemoryContext(
  options: LoadRuntimeMemoryContextOptions,
): RuntimeMemoryContext {
  const db = openDatabase(getDatabasePath(options.projectRoot));
  initializeSchema(db);
  const repo = createMemoryRepository(db);

  const projectMemory = repo.findByScope("project").map(recordToMemoryItem);
  const decisionMemory = repo.findByScope("decision").map(recordToMemoryItem);

  let agentMemory: MemoryItem[] = [];
  if (options.agentRole) {
    const role = options.agentRole;
    const allAgent = repo.findByScope("agent");
    agentMemory = allAgent.filter((r) => r.tags.includes(role)).map(recordToMemoryItem);
  } else {
    agentMemory = repo.findByScope("agent").map(recordToMemoryItem);
  }

  const runMemory: MemoryItem[] = [];
  if (options.runId) {
    const runId = options.runId;
    const allRuns = repo.findByScope("run");
    runMemory.push(...allRuns.filter((r) => r.tags.includes(runId)).map(recordToMemoryItem));
  }

  const artifactMemory = repo.findByScope("artifact").map(recordToMemoryItem);

  db.close();

  return {
    projectMemory,
    decisionMemory,
    agentMemory,
    runMemory,
    artifactMemory,
  };
}

export async function indexRuntimeMemory(projectRoot: string): Promise<MemoryItem[]> {
  const memoryDir = getMemoryDir(projectRoot);
  const db = openDatabase(getDatabasePath(projectRoot));
  initializeSchema(db);
  const repo = createMemoryRepository(db);

  const items: MemoryItem[] = [];

  const scopeDirs: { dir: string; scope: MemoryScope }[] = [
    { dir: getProjectMemoryDir(projectRoot), scope: "project" },
    { dir: getDecisionMemoryDir(projectRoot), scope: "decision" },
    { dir: getAgentMemoryDir(projectRoot), scope: "agent" },
    { dir: getIndexesDir(projectRoot), scope: "repo" },
  ];

  for (const { dir, scope } of scopeDirs) {
    const exists = await dirExists(dir);
    if (!exists) continue;

    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const filePath = join(dir, entry.name);
      const relativePath = filePath.replace(memoryDir + "/", "");

      const ext = entry.name.endsWith(".md")
        ? "markdown"
        : entry.name.endsWith(".json")
          ? "json"
          : "text";
      const format = ext;

      const id = `mem_${scope}_${relativePath.replace(/\//g, "_").replace(/\./g, "_")}`;

      const def = DEFAULT_MEMORY_FILES[relativePath];
      const title = def?.title ?? entry.name;
      const tags = def?.tags ?? [scope];

      repo.upsert({
        id,
        scope,
        title,
        path: filePath,
        format,
        tags,
      });

      const record = repo.findById(id);
      if (record) {
        items.push(recordToMemoryItem(record));
      }
    }
  }

  db.close();
  return items;
}

export async function getMemoryStatus(projectRoot: string): Promise<MemoryStatus> {
  const memoryDir = getMemoryDir(projectRoot);
  const exists = await dirExists(memoryDir);

  if (!exists) {
    return {
      exists: false,
      projectMemoryCount: 0,
      decisionMemoryCount: 0,
      agentMemoryCount: 0,
      indexedItemCount: 0,
      status: "missing",
    };
  }

  const dbPath = getDatabasePath(projectRoot);
  const dbExists = await dirExists(dbPath);

  let projectMemoryCount = 0;
  let decisionMemoryCount = 0;
  let agentMemoryCount = 0;
  let indexedItemCount = 0;

  if (dbExists) {
    const db = openDatabase(dbPath);
    initializeSchema(db);
    const repo = createMemoryRepository(db);

    projectMemoryCount = repo.countByScope("project");
    decisionMemoryCount = repo.countByScope("decision");
    agentMemoryCount = repo.countByScope("agent");
    indexedItemCount = repo.countAll();

    db.close();
  }

  const totalExpected = Object.keys(DEFAULT_MEMORY_FILES).length;
  const status: MemoryStatus["status"] =
    indexedItemCount === 0 ? "missing" : indexedItemCount < totalExpected ? "partial" : "ok";

  return {
    exists: true,
    projectMemoryCount,
    decisionMemoryCount,
    agentMemoryCount,
    indexedItemCount,
    status,
  };
}

export async function addRunMemory(
  projectRoot: string,
  runId: string,
  runTitle: string,
  requirement: string,
): Promise<MemoryItem> {
  const db = openDatabase(getDatabasePath(projectRoot));
  initializeSchema(db);
  const repo = createMemoryRepository(db);

  const id = `mem_run_${runId}`;
  const memoryDir = getMemoryDir(projectRoot);
  const runMemoryPath = join(memoryDir, "runs", `${runId}.md`);

  await mkdir(join(memoryDir, "runs"), { recursive: true });

  const content = `# Run: ${runTitle}

**Run ID**: ${runId}
**Created**: ${nowIso()}

## Requirement

${requirement}
`;

  await writeFile(runMemoryPath, content, "utf-8");

  const record = repo.upsert({
    id,
    scope: "run",
    title: runTitle,
    path: runMemoryPath,
    format: "markdown",
    tags: [runId, "run"],
    summary: requirement.slice(0, 200),
  });

  db.close();
  return recordToMemoryItem(record);
}
