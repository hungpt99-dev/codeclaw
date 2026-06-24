import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { openDatabase, initializeSchema, createMemoryRepository } from "@codeclaw/storage";
import { getDatabasePath } from "../memoryPaths.js";

export interface ArtifactIndexResult {
  indexed: number;
  skipped: number;
  errors: string[];
}

const DENY_PATTERNS = [
  ".env",
  ".env.",
  ".pem",
  ".key",
  "credentials.json",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".git",
  ".codeclaw",
];

function isDenied(filePath: string): boolean {
  return DENY_PATTERNS.some((pattern) => filePath.includes(pattern));
}

export async function indexArtifacts(
  projectRoot: string,
  runDir?: string,
): Promise<ArtifactIndexResult> {
  const db = openDatabase(getDatabasePath(projectRoot));
  initializeSchema(db);
  const repo = createMemoryRepository(db);

  let indexed = 0;
  let skipped = 0;
  const errors: string[] = [];

  const searchDir = runDir ?? join(projectRoot, ".codeclaw", "runs");

  try {
    const entries = await readdir(searchDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const runPath = join(searchDir, entry.name);

      try {
        await indexRunDir(repo, projectRoot, runPath, entry.name);
        indexed++;
      } catch (e) {
        errors.push(`Failed to index run ${entry.name}: ${String(e)}`);
        skipped++;
      }
    }
  } catch {
    skipped++;
  }

  db.close();
  return { indexed, skipped, errors };
}

async function indexRunDir(
  repo: ReturnType<typeof createMemoryRepository>,
  projectRoot: string,
  runPath: string,
  runName: string,
): Promise<void> {
  const files = await walkDir(runPath);

  for (const file of files) {
    if (isDenied(file)) continue;

    const relPath = relative(projectRoot, file);
    const id = `mem_artifact_${relPath.replace(/\//g, "_").replace(/\./g, "_")}`;

    const ext = file.endsWith(".md") ? "markdown" : file.endsWith(".json") ? "json" : "text";
    const format = ext;

    repo.upsert({
      id,
      scope: "artifact",
      title: relPath,
      path: file,
      format,
      tags: ["artifact", runName],
    });
  }
}

async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (isDenied(fullPath)) continue;

    if (entry.isDirectory()) {
      const subFiles = await walkDir(fullPath);
      results.push(...subFiles);
    } else {
      results.push(fullPath);
    }
  }

  return results;
}
