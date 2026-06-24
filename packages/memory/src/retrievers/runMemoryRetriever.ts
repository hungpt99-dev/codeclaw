import { readFile } from "node:fs/promises";
import { openDatabase, initializeSchema, createMemoryRepository } from "@codeclaw/storage";
import { getDatabasePath } from "../memoryPaths.js";

export interface RunMemoryEntry {
  title: string;
  content: string;
  path: string;
}

export async function retrieveRunMemory(
  projectRoot: string,
  runId?: string,
): Promise<RunMemoryEntry[]> {
  const dbPath = getDatabasePath(projectRoot);
  const db = openDatabase(dbPath);
  initializeSchema(db);
  const repo = createMemoryRepository(db);

  const allRecords = repo.findByScope("run");
  db.close();

  const records = runId ? allRecords.filter((r) => r.tags.includes(runId)) : allRecords;

  const entries: RunMemoryEntry[] = [];
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
