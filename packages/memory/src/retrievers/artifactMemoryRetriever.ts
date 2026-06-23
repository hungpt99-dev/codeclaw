import { readFile } from "node:fs/promises";
import { openDatabase, initializeSchema, createMemoryRepository } from "@aiteam/storage";
import { getDatabasePath } from "../memoryPaths.js";

export interface ArtifactMemoryEntry {
  title: string;
  content: string;
  path: string;
}

export async function retrieveArtifactMemory(projectRoot: string): Promise<ArtifactMemoryEntry[]> {
  const dbPath = getDatabasePath(projectRoot);
  const db = openDatabase(dbPath);
  initializeSchema(db);
  const repo = createMemoryRepository(db);

  const records = repo.findByScope("artifact");
  db.close();

  const entries: ArtifactMemoryEntry[] = [];
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
