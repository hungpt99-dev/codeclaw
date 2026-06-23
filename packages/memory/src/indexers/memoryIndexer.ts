import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { openDatabase, initializeSchema, createMemoryRepository } from "@aiteam/storage";
import type { MemoryScope } from "@aiteam/shared";
import { getMemoryDir, getDatabasePath } from "../memoryPaths.js";
import { DEFAULT_MEMORY_FILES } from "../memoryDefaults.js";

export interface IndexResult {
  indexed: number;
  skipped: number;
  errors: string[];
}

export async function indexMemoryFiles(projectRoot: string): Promise<IndexResult> {
  const memoryDir = getMemoryDir(projectRoot);
  const db = openDatabase(getDatabasePath(projectRoot));
  initializeSchema(db);
  const repo = createMemoryRepository(db);

  let indexed = 0;
  let skipped = 0;
  const errors: string[] = [];

  const scopeDirs: { dir: string; scope: MemoryScope }[] = [
    { dir: join(memoryDir, "project"), scope: "project" },
    { dir: join(memoryDir, "decisions"), scope: "decision" },
    { dir: join(memoryDir, "agents"), scope: "agent" },
    { dir: join(memoryDir, "indexes"), scope: "repo" },
  ];

  for (const { dir, scope } of scopeDirs) {
    try {
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

        try {
          repo.upsert({
            id,
            scope,
            title,
            path: filePath,
            format,
            tags,
          });
          indexed++;
        } catch (e) {
          errors.push(`Failed to index ${relativePath}: ${String(e)}`);
          skipped++;
        }
      }
    } catch {
      skipped++;
    }
  }

  db.close();
  return { indexed, skipped, errors };
}
