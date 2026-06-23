import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { openDatabase, initializeSchema } from "@aiteam/storage";
import {
  initializeRuntimeMemory,
  loadRuntimeMemoryContext,
  indexRuntimeMemory,
  getMemoryStatus,
  addRunMemory,
} from "./memoryManager.js";
import { getMemoryDir, getDatabasePath } from "./memoryPaths.js";

function tempDir(): string {
  return join(tmpdir(), "aiteam-memory-mgr-test-" + randomUUID());
}

describe("initializeRuntimeMemory", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = tempDir();
    await mkdir(projectRoot, { recursive: true });
    await mkdir(join(projectRoot, ".ai-team"), { recursive: true });
    const db = openDatabase(getDatabasePath(projectRoot));
    initializeSchema(db);
    db.close();
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("creates runtime memory structure", async () => {
    const result = await initializeRuntimeMemory({ projectRoot });

    expect(result.filesCreated.length).toBeGreaterThan(0);
    expect(result.itemsIndexed).toBeGreaterThan(0);

    const memoryDir = getMemoryDir(projectRoot);
    await access(memoryDir);
    await access(join(memoryDir, "README.md"));
    await access(join(memoryDir, "project", "project-summary.md"));
    await access(join(memoryDir, "agents", "ba-memory.md"));
  });

  it("does not overwrite existing memory without force", async () => {
    await initializeRuntimeMemory({ projectRoot });

    const memoryDir = getMemoryDir(projectRoot);
    const readmePath = join(memoryDir, "README.md");
    await writeFile(readmePath, "Custom content", "utf-8");

    const result = await initializeRuntimeMemory({ projectRoot });
    expect(result.filesSkipped).toContain("README.md");

    const { readFile } = await import("node:fs/promises");
    const content = await readFile(readmePath, "utf-8");
    expect(content).toBe("Custom content");
  });

  it("overwrites existing memory with force", async () => {
    await initializeRuntimeMemory({ projectRoot });

    const memoryDir = getMemoryDir(projectRoot);
    const readmePath = join(memoryDir, "README.md");
    await writeFile(readmePath, "Custom content", "utf-8");

    const result = await initializeRuntimeMemory({ projectRoot, force: true });
    expect(result.filesCreated).toContain("README.md");

    const { readFile } = await import("node:fs/promises");
    const content = await readFile(readmePath, "utf-8");
    expect(content).toContain("Runtime Memory");
  });
});

describe("loadRuntimeMemoryContext", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = tempDir();
    await mkdir(projectRoot, { recursive: true });
    await mkdir(join(projectRoot, ".ai-team"), { recursive: true });
    const db = openDatabase(getDatabasePath(projectRoot));
    initializeSchema(db);
    db.close();
    await initializeRuntimeMemory({ projectRoot });
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("loads project memory", () => {
    const context = loadRuntimeMemoryContext({ projectRoot });
    expect(context.projectMemory.length).toBeGreaterThan(0);
    const summary = context.projectMemory.find((m) => m.title === "Project Summary");
    expect(summary).toBeDefined();
  });

  it("loads decision memory", () => {
    const context = loadRuntimeMemoryContext({ projectRoot });
    expect(context.decisionMemory.length).toBeGreaterThan(0);
  });

  it("loads agent memory filtered by role", () => {
    const context = loadRuntimeMemoryContext({
      projectRoot,
      agentRole: "ba",
    });
    expect(context.agentMemory.length).toBeGreaterThan(0);
    const baMem = context.agentMemory.find((m) => m.title === "BA Agent Memory");
    expect(baMem).toBeDefined();
  });

  it("loads all agent memory when no role specified", () => {
    const context = loadRuntimeMemoryContext({ projectRoot });
    expect(context.agentMemory.length).toBeGreaterThanOrEqual(5);
  });
});

describe("indexRuntimeMemory", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = tempDir();
    await mkdir(projectRoot, { recursive: true });
    await mkdir(join(projectRoot, ".ai-team"), { recursive: true });
    const db = openDatabase(getDatabasePath(projectRoot));
    initializeSchema(db);
    db.close();
    await initializeRuntimeMemory({ projectRoot });
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("indexes memory files into SQLite", async () => {
    const items = await indexRuntimeMemory(projectRoot);
    expect(items.length).toBeGreaterThan(0);

    const projectItems = items.filter((i) => i.scope === "project");
    expect(projectItems.length).toBeGreaterThan(0);
  });
});

describe("getMemoryStatus", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = tempDir();
    await mkdir(projectRoot, { recursive: true });
    await mkdir(join(projectRoot, ".ai-team"), { recursive: true });
    const db = openDatabase(getDatabasePath(projectRoot));
    initializeSchema(db);
    db.close();
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("returns missing when memory does not exist", async () => {
    const status = await getMemoryStatus(projectRoot);
    expect(status.exists).toBe(false);
    expect(status.status).toBe("missing");
  });

  it("returns ok when memory is initialized", async () => {
    await initializeRuntimeMemory({ projectRoot });
    const status = await getMemoryStatus(projectRoot);
    expect(status.exists).toBe(true);
    expect(status.projectMemoryCount).toBeGreaterThan(0);
    expect(status.agentMemoryCount).toBeGreaterThan(0);
  });
});

describe("addRunMemory", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = tempDir();
    await mkdir(projectRoot, { recursive: true });
    await mkdir(join(projectRoot, ".ai-team"), { recursive: true });
    const db = openDatabase(getDatabasePath(projectRoot));
    initializeSchema(db);
    db.close();
    await initializeRuntimeMemory({ projectRoot });
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("creates run memory file and indexes it", async () => {
    const item = await addRunMemory(projectRoot, "run-001", "Test Run", "Build a feature");
    expect(item.scope).toBe("run");
    expect(item.title).toBe("Test Run");
    expect(item.tags).toContain("run-001");

    const memoryDir = getMemoryDir(projectRoot);
    await access(join(memoryDir, "runs", "run-001.md"));
  });
});
