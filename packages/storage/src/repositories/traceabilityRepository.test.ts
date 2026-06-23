import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "../test-helpers.js";
import { createTraceabilityRepository } from "./traceabilityRepository.js";
import { createRunRepository } from "./runRepository.js";

describe("TraceabilityRepository", () => {
  let db: Database.Database;
  let repo: ReturnType<typeof createTraceabilityRepository>;

  beforeEach(() => {
    db = createTestDb();
    repo = createTraceabilityRepository(db);
    const runRepo = createRunRepository(db);
    runRepo.create({
      id: "run-1",
      title: "Test Run",
      rawRequirement: "Build a test app",
      mode: "docs-only",
      outputLanguage: "English",
    });
  });

  const sampleInput = {
    id: "trace-1",
    runId: "run-1",
    requirementId: "REQ-001",
    requirementText: "User can export invoices",
    acceptanceCriteriaIds: ["AC-001", "AC-002"],
    taskIds: ["TASK-001"],
    codeFiles: ["InvoiceService.java"],
    testCases: ["TC-001"],
    testResults: ["PASSED"],
    status: "COVERED" as const,
  };

  describe("create", () => {
    it("creates a traceability item and returns the record", () => {
      const record = repo.create(sampleInput);

      expect(record.id).toBe("trace-1");
      expect(record.runId).toBe("run-1");
      expect(record.requirementId).toBe("REQ-001");
      expect(record.acceptanceCriteriaIds).toEqual(["AC-001", "AC-002"]);
      expect(record.taskIds).toEqual(["TASK-001"]);
      expect(record.codeFiles).toEqual(["InvoiceService.java"]);
      expect(record.testCases).toEqual(["TC-001"]);
      expect(record.testResults).toEqual(["PASSED"]);
      expect(record.status).toBe("COVERED");
    });
  });

  describe("findByRunId", () => {
    it("returns all items for a run", () => {
      repo.create(sampleInput);
      repo.create({
        ...sampleInput,
        id: "trace-2",
        requirementId: "REQ-002",
      });

      const items = repo.findByRunId("run-1");
      expect(items).toHaveLength(2);
    });

    it("returns empty array when no items exist", () => {
      const items = repo.findByRunId("nonexistent");
      expect(items).toEqual([]);
    });
  });

  describe("findByRequirementId", () => {
    it("returns the item for a matching requirement", () => {
      repo.create(sampleInput);

      const item = repo.findByRequirementId("run-1", "REQ-001");
      expect(item).toBeDefined();
      expect(item?.requirementId).toBe("REQ-001");
    });

    it("returns undefined for a non-matching requirement", () => {
      const item = repo.findByRequirementId("run-1", "REQ-999");
      expect(item).toBeUndefined();
    });
  });

  describe("deleteByRunId", () => {
    it("deletes all items for a run", () => {
      repo.create(sampleInput);
      repo.deleteByRunId("run-1");

      const items = repo.findByRunId("run-1");
      expect(items).toEqual([]);
    });
  });

  describe("getSummary", () => {
    it("returns correct counts", () => {
      repo.create(sampleInput);
      repo.create({
        ...sampleInput,
        id: "trace-2",
        requirementId: "REQ-002",
        status: "PARTIAL",
        taskIds: ["TASK-001"],
        testCases: [],
      });
      repo.create({
        ...sampleInput,
        id: "trace-3",
        requirementId: "REQ-003",
        status: "NOT_COVERED",
        taskIds: [],
        testCases: [],
      });

      const summary = repo.getSummary("run-1");
      expect(summary.total).toBe(3);
      expect(summary.covered).toBe(1);
      expect(summary.partial).toBe(1);
      expect(summary.notCovered).toBe(1);
    });

    it("returns zeros when no items exist", () => {
      const summary = repo.getSummary("run-1");
      expect(summary.total).toBe(0);
      expect(summary.covered).toBe(0);
      expect(summary.partial).toBe(0);
      expect(summary.notCovered).toBe(0);
    });
  });
});
