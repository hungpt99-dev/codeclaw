import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { openDatabase, initializeSchema, createMemoryRepository } from "@aiteam/storage";

function tempDir(): string {
  return join(tmpdir(), "aiteam-memory-test-" + randomUUID());
}

describe("MemoryRepository", () => {
  let testDir: string;
  let db: ReturnType<typeof openDatabase>;
  let repo: ReturnType<typeof createMemoryRepository>;

  beforeEach(async () => {
    testDir = tempDir();
    await mkdir(testDir, { recursive: true });
    const dbPath = join(testDir, "test.db");
    db = openDatabase(dbPath);
    initializeSchema(db);
    repo = createMemoryRepository(db);
  });

  afterEach(async () => {
    db.close();
    await rm(testDir, { recursive: true, force: true });
  });

  describe("create", () => {
    it("creates a memory item and returns the record", () => {
      const record = repo.create({
        id: "mem-1",
        scope: "project",
        title: "Test Project",
        path: "/tmp/test.md",
        format: "markdown",
        tags: ["project", "test"],
      });

      expect(record.id).toBe("mem-1");
      expect(record.scope).toBe("project");
      expect(record.title).toBe("Test Project");
      expect(record.path).toBe("/tmp/test.md");
      expect(record.format).toBe("markdown");
      expect(record.tags).toEqual(["project", "test"]);
      expect(record.createdAt).toBeDefined();
      expect(record.updatedAt).toBeDefined();
    });

    it("stores tags as JSON array", () => {
      repo.create({
        id: "mem-2",
        scope: "agent",
        title: "BA Agent",
        path: "/tmp/ba.md",
        format: "markdown",
        tags: ["agent", "ba", "business"],
      });

      const found = repo.findById("mem-2");
      expect(found).toBeDefined();
      if (found) {
        expect(found.tags).toEqual(["agent", "ba", "business"]);
      }
    });

    it("stores summary when provided", () => {
      repo.create({
        id: "mem-3",
        scope: "project",
        title: "Summary Test",
        path: "/tmp/summary.md",
        format: "markdown",
        tags: [],
        summary: "A test summary",
      });

      const found = repo.findById("mem-3");
      expect(found).toBeDefined();
      if (found) {
        expect(found.summary).toBe("A test summary");
      }
    });

    it("stores null summary when not provided", () => {
      repo.create({
        id: "mem-4",
        scope: "project",
        title: "No Summary",
        path: "/tmp/nosummary.md",
        format: "markdown",
        tags: [],
      });

      const found = repo.findById("mem-4");
      expect(found).toBeDefined();
      if (found) {
        expect(found.summary).toBeNull();
      }
    });
  });

  describe("findById", () => {
    it("returns undefined for non-existent id", () => {
      const found = repo.findById("nonexistent");
      expect(found).toBeUndefined();
    });

    it("returns the record for an existing id", () => {
      repo.create({
        id: "mem-5",
        scope: "project",
        title: "Find Test",
        path: "/tmp/find.md",
        format: "markdown",
        tags: [],
      });

      const found = repo.findById("mem-5");
      expect(found).toBeDefined();
      if (found) {
        expect(found.title).toBe("Find Test");
      }
    });
  });

  describe("findByScope", () => {
    it("returns items matching the scope", () => {
      repo.create({
        id: "mem-p1",
        scope: "project",
        title: "Project 1",
        path: "/tmp/p1.md",
        format: "markdown",
        tags: [],
      });
      repo.create({
        id: "mem-p2",
        scope: "project",
        title: "Project 2",
        path: "/tmp/p2.md",
        format: "markdown",
        tags: [],
      });
      repo.create({
        id: "mem-a1",
        scope: "agent",
        title: "Agent 1",
        path: "/tmp/a1.md",
        format: "markdown",
        tags: [],
      });

      const projectItems = repo.findByScope("project");
      expect(projectItems).toHaveLength(2);

      const agentItems = repo.findByScope("agent");
      expect(agentItems).toHaveLength(1);
    });

    it("returns empty array for scope with no items", () => {
      const items = repo.findByScope("decision");
      expect(items).toEqual([]);
    });
  });

  describe("findByTag", () => {
    it("returns items matching the tag", () => {
      repo.create({
        id: "mem-t1",
        scope: "agent",
        title: "BA Agent",
        path: "/tmp/ba.md",
        format: "markdown",
        tags: ["agent", "ba"],
      });
      repo.create({
        id: "mem-t2",
        scope: "agent",
        title: "Architect Agent",
        path: "/tmp/arch.md",
        format: "markdown",
        tags: ["agent", "architect"],
      });

      const baItems = repo.findByTag("ba");
      expect(baItems).toHaveLength(1);
      if (baItems[0]) {
        expect(baItems[0].title).toBe("BA Agent");
      }
    });
  });

  describe("findAll", () => {
    it("returns all items", () => {
      repo.create({
        id: "mem-all1",
        scope: "project",
        title: "All 1",
        path: "/tmp/all1.md",
        format: "markdown",
        tags: [],
      });
      repo.create({
        id: "mem-all2",
        scope: "agent",
        title: "All 2",
        path: "/tmp/all2.md",
        format: "markdown",
        tags: [],
      });

      const all = repo.findAll();
      expect(all).toHaveLength(2);
    });
  });

  describe("upsert", () => {
    it("creates new item when not exists", () => {
      const record = repo.upsert({
        id: "mem-upsert1",
        scope: "project",
        title: "Upsert Test",
        path: "/tmp/upsert.md",
        format: "markdown",
        tags: [],
      });

      expect(record.id).toBe("mem-upsert1");
    });

    it("updates existing item", () => {
      repo.create({
        id: "mem-upsert2",
        scope: "project",
        title: "Original",
        path: "/tmp/original.md",
        format: "markdown",
        tags: ["old"],
      });

      const updated = repo.upsert({
        id: "mem-upsert2",
        scope: "project",
        title: "Updated",
        path: "/tmp/updated.md",
        format: "markdown",
        tags: ["new"],
      });

      expect(updated.title).toBe("Updated");
      expect(updated.tags).toEqual(["new"]);
    });
  });

  describe("deleteById", () => {
    it("returns true when item deleted", () => {
      repo.create({
        id: "mem-del1",
        scope: "project",
        title: "Delete Me",
        path: "/tmp/del.md",
        format: "markdown",
        tags: [],
      });

      const result = repo.deleteById("mem-del1");
      expect(result).toBe(true);
      expect(repo.findById("mem-del1")).toBeUndefined();
    });

    it("returns false when item not found", () => {
      const result = repo.deleteById("nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("deleteAll", () => {
    it("removes all items", () => {
      repo.create({
        id: "mem-da1",
        scope: "project",
        title: "DA 1",
        path: "/tmp/da1.md",
        format: "markdown",
        tags: [],
      });
      repo.create({
        id: "mem-da2",
        scope: "agent",
        title: "DA 2",
        path: "/tmp/da2.md",
        format: "markdown",
        tags: [],
      });

      repo.deleteAll();
      expect(repo.findAll()).toEqual([]);
    });
  });

  describe("createRelation", () => {
    it("creates a relation between two memory items", () => {
      repo.create({
        id: "mem-rel1",
        scope: "project",
        title: "Source",
        path: "/tmp/src.md",
        format: "markdown",
        tags: [],
      });
      repo.create({
        id: "mem-rel2",
        scope: "decision",
        title: "Target",
        path: "/tmp/tgt.md",
        format: "markdown",
        tags: [],
      });

      const relation = repo.createRelation({
        id: "rel-1",
        sourceMemoryId: "mem-rel1",
        targetMemoryId: "mem-rel2",
        relationType: "references",
      });

      expect(relation.id).toBe("rel-1");
      expect(relation.sourceMemoryId).toBe("mem-rel1");
      expect(relation.targetMemoryId).toBe("mem-rel2");
      expect(relation.relationType).toBe("references");
    });
  });

  describe("findRelations", () => {
    it("returns relations for a memory item", () => {
      repo.create({
        id: "mem-fr1",
        scope: "project",
        title: "FR 1",
        path: "/tmp/fr1.md",
        format: "markdown",
        tags: [],
      });
      repo.create({
        id: "mem-fr2",
        scope: "decision",
        title: "FR 2",
        path: "/tmp/fr2.md",
        format: "markdown",
        tags: [],
      });

      repo.createRelation({
        id: "rel-fr1",
        sourceMemoryId: "mem-fr1",
        targetMemoryId: "mem-fr2",
        relationType: "depends-on",
      });

      const relations = repo.findRelations("mem-fr1");
      expect(relations).toHaveLength(1);
      if (relations[0]) {
        expect(relations[0].relationType).toBe("depends-on");
      }
    });
  });

  describe("countByScope", () => {
    it("counts items by scope", () => {
      repo.create({
        id: "mem-c1",
        scope: "project",
        title: "C1",
        path: "/tmp/c1.md",
        format: "markdown",
        tags: [],
      });
      repo.create({
        id: "mem-c2",
        scope: "project",
        title: "C2",
        path: "/tmp/c2.md",
        format: "markdown",
        tags: [],
      });
      repo.create({
        id: "mem-c3",
        scope: "agent",
        title: "C3",
        path: "/tmp/c3.md",
        format: "markdown",
        tags: [],
      });

      expect(repo.countByScope("project")).toBe(2);
      expect(repo.countByScope("agent")).toBe(1);
      expect(repo.countByScope("decision")).toBe(0);
    });
  });

  describe("countAll", () => {
    it("counts all items", () => {
      expect(repo.countAll()).toBe(0);

      repo.create({
        id: "mem-ca1",
        scope: "project",
        title: "CA1",
        path: "/tmp/ca1.md",
        format: "markdown",
        tags: [],
      });

      expect(repo.countAll()).toBe(1);
    });
  });
});
