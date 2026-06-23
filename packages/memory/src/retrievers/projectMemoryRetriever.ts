import { readFile } from "node:fs/promises";
import { openDatabase, initializeSchema, createMemoryRepository } from "@aiteam/storage";
import { getDatabasePath } from "../memoryPaths.js";

export interface ProjectMemoryEntry {
  title: string;
  content: string;
  path: string;
}

export async function retrieveProjectMemory(projectRoot: string): Promise<ProjectMemoryEntry[]> {
  const dbPath = getDatabasePath(projectRoot);
  const db = openDatabase(dbPath);
  initializeSchema(db);
  const repo = createMemoryRepository(db);

  const records = repo.findByScope("project");
  db.close();

  const entries: ProjectMemoryEntry[] = [];
  for (const record of records) {
    try {
      const content = await readFile(record.path, "utf-8");
      entries.push({
        title: record.title,
        content,
        path: record.path,
      });
    } catch {
      entries.push({
        title: record.title,
        content: "",
        path: record.path,
      });
    }
  }

  return entries;
}
