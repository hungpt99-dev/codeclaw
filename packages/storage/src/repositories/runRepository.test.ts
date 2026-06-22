import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "../test-helpers.js";
import { createRunRepository } from "./runRepository.js";
import { RunStatusValues } from "@aiteam/shared";

describe("RunRepository", () => {
  let db: Database.Database;
  let repo: ReturnType<typeof createRunRepository>;

  beforeEach(() => {
    db = createTestDb();
    repo = createRunRepository(db);
  });

  describe("create", () => {
    it("creates a run and returns the record", () => {
      const record = repo.create({
        id: "run-1",
        title: "Test Run",
        rawRequirement: "Build a todo app",
        mode: "semi-auto",
      });

      expect(record.id).toBe("run-1");
      expect(record.title).toBe("Test Run");
      expect(record.rawRequirement).toBe("Build a todo app");
      expect(record.mode).toBe("semi-auto");
      expect(record.status).toBe("CREATED");
      expect(record.createdAt).toBeDefined();
      expect(record.updatedAt).toBeDefined();
      expect(record.createdAt).toBe(record.updatedAt);
    });
  });

  describe("findById", () => {
    it("returns the record for an existing id", () => {
      repo.create({
        id: "run-1",
        title: "Test Run",
        rawRequirement: "Build a todo app",
        mode: "semi-auto",
      });

      const found = repo.findById("run-1");
      expect(found).toBeDefined();
      if (found) {
        expect(found.id).toBe("run-1");
      }
    });

    it("returns undefined for a non-existent id", () => {
      const found = repo.findById("nonexistent");
      expect(found).toBeUndefined();
    });
  });

  describe("findRecent", () => {
    it("returns runs ordered by created_at descending", async () => {
      repo.create({
        id: "run-1",
        title: "First",
        rawRequirement: "req 1",
        mode: "docs-only",
      });
      await new Promise((r) => setTimeout(r, 2));
      repo.create({
        id: "run-2",
        title: "Second",
        rawRequirement: "req 2",
        mode: "assisted",
      });

      const recent = repo.findRecent(10);
      expect(recent).toHaveLength(2);
      if (recent[0] && recent[1]) {
        expect(recent[0].id).toBe("run-2");
        expect(recent[1].id).toBe("run-1");
      }
    });

    it("respects the limit parameter", () => {
      repo.create({
        id: "run-1",
        title: "First",
        rawRequirement: "req 1",
        mode: "docs-only",
      });
      repo.create({
        id: "run-2",
        title: "Second",
        rawRequirement: "req 2",
        mode: "docs-only",
      });

      const recent = repo.findRecent(1);
      expect(recent).toHaveLength(1);
    });

    it("returns an empty array when no runs exist", () => {
      const recent = repo.findRecent(10);
      expect(recent).toEqual([]);
    });
  });

  describe("updateStatus", () => {
    it("updates the status and updated_at", async () => {
      const created = repo.create({
        id: "run-1",
        title: "Test Run",
        rawRequirement: "Build a todo app",
        mode: "semi-auto",
      });

      await new Promise((r) => setTimeout(r, 2));
      const updated = repo.updateStatus("run-1", RunStatusValues.SPEC_GENERATED);
      expect(updated).toBeDefined();
      if (updated) {
        expect(updated.status).toBe("SPEC_GENERATED");
        expect(updated.updatedAt).not.toBe(created.updatedAt);
      }
    });

    it("returns undefined for a non-existent id", () => {
      const result = repo.updateStatus("nonexistent", RunStatusValues.FAILED);
      expect(result).toBeUndefined();
    });
  });
});
