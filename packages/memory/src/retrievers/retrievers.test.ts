import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { openDatabase, initializeSchema } from "@codeclaw/storage";
import { initializeRuntimeMemory } from "../memoryManager.js";
import { getDatabasePath } from "../memoryPaths.js";
import { retrieveProjectMemory } from "./projectMemoryRetriever.js";
import { retrieveDecisionMemory } from "./decisionMemoryRetriever.js";
import { retrieveAgentMemory } from "./agentMemoryRetriever.js";
import { retrieveRunMemory } from "./runMemoryRetriever.js";
import { retrieveArtifactMemory } from "./artifactMemoryRetriever.js";
import { buildAgentContext } from "../context/buildAgentContext.js";

function tempDir(): string {
  return join(tmpdir(), "codeclaw-retrievers-test-" + randomUUID());
}

describe("retrievers", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = tempDir();
    await mkdir(projectRoot, { recursive: true });
    await mkdir(join(projectRoot, ".codeclaw"), { recursive: true });
    const db = openDatabase(getDatabasePath(projectRoot));
    initializeSchema(db);
    db.close();
    await initializeRuntimeMemory({ projectRoot });
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  describe("retrieveProjectMemory", () => {
    it("returns project memory entries with content", async () => {
      const entries = await retrieveProjectMemory(projectRoot);
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.title).toBeTruthy();
        expect(entry.path).toBeTruthy();
      }
    });
  });

  describe("retrieveDecisionMemory", () => {
    it("returns decision memory entries", async () => {
      const entries = await retrieveDecisionMemory(projectRoot);
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe("retrieveAgentMemory", () => {
    it("returns all agent memory when no role specified", async () => {
      const entries = await retrieveAgentMemory(projectRoot);
      expect(entries.length).toBeGreaterThanOrEqual(5);
    });

    it("filters by agent role", async () => {
      const entries = await retrieveAgentMemory(projectRoot, "ba");
      expect(entries.length).toBeGreaterThan(0);
      const baEntry = entries.find((e) => e.title === "BA Agent Memory");
      expect(baEntry).toBeDefined();
    });
  });

  describe("retrieveRunMemory", () => {
    it("returns empty when no run memory exists", async () => {
      const entries = await retrieveRunMemory(projectRoot);
      expect(entries).toEqual([]);
    });
  });

  describe("retrieveArtifactMemory", () => {
    it("returns empty when no artifact memory exists", async () => {
      const entries = await retrieveArtifactMemory(projectRoot);
      expect(entries).toEqual([]);
    });
  });
});

describe("buildAgentContext", () => {
  it("builds context from memory entries", () => {
    const context = buildAgentContext({
      agentRole: "ba",
      projectRoot: "/tmp/test",
      rawRequirement: "Build a feature",
      projectMemory: [{ title: "Project Summary", content: "# Summary", path: "/tmp/summary.md" }],
      decisionMemory: [],
      agentMemory: [{ title: "BA Agent Memory", content: "# BA Memory", path: "/tmp/ba.md" }],
      runArtifacts: [],
    });

    expect(context.agentRole).toBe("ba");
    expect(context.rawRequirement).toBe("Build a feature");
    expect(context.projectMemory).toHaveLength(1);
    expect(context.agentMemory).toHaveLength(1);
    expect(context.runArtifacts).toEqual([]);
  });

  it("defaults runArtifacts to empty array", () => {
    const context = buildAgentContext({
      agentRole: "architect",
      projectRoot: "/tmp/test",
      projectMemory: [],
      decisionMemory: [],
      agentMemory: [],
    });

    expect(context.runArtifacts).toEqual([]);
  });
});
