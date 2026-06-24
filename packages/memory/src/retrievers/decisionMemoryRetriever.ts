import { readFile } from "node:fs/promises";
import { openDatabase, initializeSchema, createMemoryRepository } from "@codeclaw/storage";
import { getDatabasePath } from "../memoryPaths.js";

export interface DecisionMemoryEntry {
  title: string;
  content: string;
  path: string;
}

export async function retrieveDecisionMemory(projectRoot: string): Promise<DecisionMemoryEntry[]> {
  const dbPath = getDatabasePath(projectRoot);
  const db = openDatabase(dbPath);
  initializeSchema(db);
  const repo = createMemoryRepository(db);

  const records = repo.findByScope("decision");
  db.close();

  const entries: DecisionMemoryEntry[] = [];
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
