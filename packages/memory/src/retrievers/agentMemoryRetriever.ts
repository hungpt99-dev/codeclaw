import { readFile } from "node:fs/promises";
import { openDatabase, initializeSchema, createMemoryRepository } from "@codeclaw/storage";
import type { AgentRole } from "@codeclaw/shared";
import { getDatabasePath } from "../memoryPaths.js";

export interface AgentMemoryEntry {
  title: string;
  content: string;
  path: string;
}

export async function retrieveAgentMemory(
  projectRoot: string,
  agentRole?: AgentRole,
): Promise<AgentMemoryEntry[]> {
  const dbPath = getDatabasePath(projectRoot);
  const db = openDatabase(dbPath);
  initializeSchema(db);
  const repo = createMemoryRepository(db);

  const allRecords = repo.findByScope("agent");
  db.close();

  const records = agentRole ? allRecords.filter((r) => r.tags.includes(agentRole)) : allRecords;

  const entries: AgentMemoryEntry[] = [];
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
