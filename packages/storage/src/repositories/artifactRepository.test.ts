import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "../test-helpers.js";
import { createRunRepository } from "./runRepository.js";
import { createArtifactRepository } from "./artifactRepository.js";
import { ArtifactTypeValues } from "@aiteam/shared";

describe("ArtifactRepository", () => {
  let db: Database.Database;
  let artifactRepo: ReturnType<typeof createArtifactRepository>;
  let runRepo: ReturnType<typeof createRunRepository>;

  beforeEach(() => {
    db = createTestDb();
    artifactRepo = createArtifactRepository(db);
    runRepo = createRunRepository(db);
    runRepo.create({
      id: "run-1",
      title: "Test Run",
      rawRequirement: "Build a todo app",
      mode: "semi-auto",
    });
  });

  describe("create", () => {
    it("creates an artifact and returns the record", () => {
      const record = artifactRepo.create({
        id: "artifact-1",
        runId: "run-1",
        type: ArtifactTypeValues.TECHNICAL_DESIGN,
        name: "design.md",
        path: "/tmp/design.md",
        format: "markdown",
      });

      expect(record.id).toBe("artifact-1");
      expect(record.runId).toBe("run-1");
      expect(record.type).toBe("TECHNICAL_DESIGN");
      expect(record.name).toBe("design.md");
      expect(record.path).toBe("/tmp/design.md");
      expect(record.format).toBe("markdown");
      expect(record.createdAt).toBeDefined();
    });
  });

  describe("findByRunId", () => {
    it("returns all artifacts for a run ordered by created_at", () => {
      artifactRepo.create({
        id: "artifact-1",
        runId: "run-1",
        type: ArtifactTypeValues.TECHNICAL_DESIGN,
        name: "design.md",
        path: "/tmp/design.md",
        format: "markdown",
      });
      artifactRepo.create({
        id: "artifact-2",
        runId: "run-1",
        type: ArtifactTypeValues.API_DESIGN,
        name: "api.md",
        path: "/tmp/api.md",
        format: "markdown",
      });

      const artifacts = artifactRepo.findByRunId("run-1");
      expect(artifacts).toHaveLength(2);
      if (artifacts[0] && artifacts[1]) {
        expect(artifacts[0].id).toBe("artifact-1");
        expect(artifacts[1].id).toBe("artifact-2");
      }
    });

    it("returns an empty array when no artifacts exist for the run", () => {
      const artifacts = artifactRepo.findByRunId("run-1");
      expect(artifacts).toEqual([]);
    });
  });

  describe("findById", () => {
    it("returns the artifact for an existing id", () => {
      artifactRepo.create({
        id: "artifact-1",
        runId: "run-1",
        type: ArtifactTypeValues.TECHNICAL_DESIGN,
        name: "design.md",
        path: "/tmp/design.md",
        format: "markdown",
      });

      const found = artifactRepo.findById("artifact-1");
      expect(found).toBeDefined();
      if (found) {
        expect(found.id).toBe("artifact-1");
      }
    });

    it("returns undefined for a non-existent id", () => {
      const found = artifactRepo.findById("nonexistent");
      expect(found).toBeUndefined();
    });
  });
});
