import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "../test-helpers.js";
import { createStepExecutionRepository } from "./stepExecutionRepository.js";
import { createRunRepository } from "./runRepository.js";

describe("StepExecutionRepository", () => {
  let db: Database.Database;
  let repo: ReturnType<typeof createStepExecutionRepository>;

  beforeEach(() => {
    db = createTestDb();
    repo = createStepExecutionRepository(db);

    const runRepo = createRunRepository(db);
    runRepo.create({
      id: "run-1",
      title: "Test Run",
      rawRequirement: "Build a todo app",
      outputLanguage: "English",
      mode: "docs-only",
    });
  });

  it("creates a step execution with PENDING status", () => {
    const step = repo.create({
      id: "step-1",
      runId: "run-1",
      stepIndex: 0,
      stepName: "BA Analysis",
      agentRole: "BA",
    });

    expect(step.id).toBe("step-1");
    expect(step.runId).toBe("run-1");
    expect(step.stepIndex).toBe(0);
    expect(step.stepName).toBe("BA Analysis");
    expect(step.agentRole).toBe("BA");
    expect(step.status).toBe("PENDING");
    expect(step.startedAt).toBeNull();
    expect(step.endedAt).toBeNull();
    expect(step.durationMs).toBeNull();
    expect(step.errorMessage).toBeNull();
    expect(step.outputArtifactPath).toBeNull();
  });

  it("finds steps by run ID in order", () => {
    repo.create({ id: "s1", runId: "run-1", stepIndex: 0, stepName: "First", agentRole: null });
    repo.create({ id: "s2", runId: "run-1", stepIndex: 1, stepName: "Second", agentRole: null });
    repo.create({ id: "s3", runId: "run-1", stepIndex: 2, stepName: "Third", agentRole: null });

    const steps = repo.findByRunId("run-1");
    expect(steps).toHaveLength(3);
    expect(steps[0]?.stepName).toBe("First");
    expect(steps[1]?.stepName).toBe("Second");
    expect(steps[2]?.stepName).toBe("Third");
  });

  it("finds step by run ID and step index", () => {
    repo.create({ id: "s1", runId: "run-1", stepIndex: 0, stepName: "First", agentRole: null });
    repo.create({ id: "s2", runId: "run-1", stepIndex: 1, stepName: "Second", agentRole: null });

    const step = repo.findByRunIdAndStepIndex("run-1", 1);
    expect(step).not.toBeUndefined();
    expect(step?.stepName).toBe("Second");
  });

  it("returns undefined for non-existent step index", () => {
    const step = repo.findByRunIdAndStepIndex("run-1", 99);
    expect(step).toBeUndefined();
  });

  it("updates step status", () => {
    repo.create({ id: "s1", runId: "run-1", stepIndex: 0, stepName: "Test", agentRole: null });
    const updated = repo.updateStatus("s1", "RUNNING");
    expect(updated?.status).toBe("RUNNING");
  });

  it("updates started_at when starting", () => {
    repo.create({ id: "s1", runId: "run-1", stepIndex: 0, stepName: "Test", agentRole: null });
    const started = repo.updateStartedAt("s1");
    expect(started?.status).toBe("RUNNING");
    expect(started?.startedAt).not.toBeNull();
  });

  it("completes a step with duration and artifact", () => {
    repo.create({ id: "s1", runId: "run-1", stepIndex: 0, stepName: "Test", agentRole: null });
    repo.updateStartedAt("s1");
    const completed = repo.updateComplete("s1", "COMPLETED", 1234, null, "/path/artifact.md");
    expect(completed?.status).toBe("COMPLETED");
    expect(completed?.durationMs).toBe(1234);
    expect(completed?.endedAt).not.toBeNull();
    expect(completed?.outputArtifactPath).toBe("/path/artifact.md");
  });

  it("fails a step with error message", () => {
    repo.create({ id: "s1", runId: "run-1", stepIndex: 0, stepName: "Test", agentRole: null });
    repo.updateStartedAt("s1");
    const failed = repo.updateComplete("s1", "FAILED", 500, "Something went wrong", null);
    expect(failed?.status).toBe("FAILED");
    expect(failed?.errorMessage).toBe("Something went wrong");
    expect(failed?.durationMs).toBe(500);
  });

  it("returns empty array for run with no steps", () => {
    const steps = repo.findByRunId("non-existent");
    expect(steps).toHaveLength(0);
  });
});
