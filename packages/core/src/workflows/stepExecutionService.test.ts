import { describe, it, expect, vi } from "vitest";
import type { StepExecution } from "@codeclaw/shared";
import { runWithStepTracking, createStepExecutionId } from "./stepExecutionService.js";
import type { StepExecutionRepo } from "./stepExecutionService.js";

function createMockRepo(): StepExecutionRepo {
  const store = new Map<string, StepExecution>();

  return {
    findByRunIdAndStepIndex(runId: string, stepIndex: number): StepExecution | undefined {
      for (const step of store.values()) {
        if (step.runId === runId && step.stepIndex === stepIndex) {
          return step;
        }
      }
      return undefined;
    },
    create(input): StepExecution {
      const record: StepExecution = {
        id: input.id,
        runId: input.runId,
        stepIndex: input.stepIndex,
        stepName: input.stepName,
        agentRole: input.agentRole,
        status: "PENDING",
        startedAt: null,
        endedAt: null,
        durationMs: null,
        errorMessage: null,
        outputArtifactPath: null,
      };
      store.set(input.id, record);
      return record;
    },
    updateStartedAt(id: string): StepExecution | undefined {
      const record = store.get(id);
      if (!record) return undefined;
      record.status = "RUNNING";
      record.startedAt = new Date().toISOString();
      return record;
    },
    updateComplete(
      id,
      status,
      durationMs,
      errorMessage,
      outputArtifactPath,
    ): StepExecution | undefined {
      const record = store.get(id);
      if (!record) return undefined;
      record.status = status;
      record.endedAt = new Date().toISOString();
      record.durationMs = durationMs;
      record.errorMessage = errorMessage;
      record.outputArtifactPath = outputArtifactPath;
      return record;
    },
  };
}

describe("stepExecutionService", () => {
  describe("createStepExecutionId", () => {
    it("generates unique step IDs", () => {
      const id = createStepExecutionId("run-1", 0);
      expect(id).toBe("run-1_step_0");
    });
  });

  describe("runWithStepTracking", () => {
    it("records a successful step execution", async () => {
      const repo = createMockRepo();
      const result = await runWithStepTracking(repo, {
        runId: "run-1",
        stepIndex: 0,
        stepName: "BA Analysis",
        agentRole: "BA",
        execute: () => Promise.resolve({ success: true, artifactPath: "/path/output.md" }),
      });

      expect(result.execution.status).toBe("COMPLETED");
      expect(result.execution.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.execution.outputArtifactPath).toBe("/path/output.md");
      expect(result.stepOutput.success).toBe(true);
    });

    it("records a failed step execution", async () => {
      const repo = createMockRepo();
      const result = await runWithStepTracking(repo, {
        runId: "run-1",
        stepIndex: 0,
        stepName: "Failing Step",
        agentRole: null,
        execute: () => Promise.resolve({ success: false, error: "Something went wrong" }),
      });

      expect(result.execution.status).toBe("FAILED");
      expect(result.execution.errorMessage).toContain("went wrong");
      expect(result.stepOutput.success).toBe(false);
    });

    it("handles exceptions from execute function", async () => {
      const repo = createMockRepo();
      const result = await runWithStepTracking(repo, {
        runId: "run-1",
        stepIndex: 0,
        stepName: "Exception Step",
        agentRole: null,
        execute: () => Promise.reject(new Error("Unexpected crash")),
      });

      expect(result.execution.status).toBe("FAILED");
      expect(result.execution.errorMessage).toContain("Unexpected crash");
      expect(result.stepOutput.success).toBe(false);
    });

    it("skips already completed steps", async () => {
      const repo = createMockRepo();
      repo.create({
        id: "run-1_step_0",
        runId: "run-1",
        stepIndex: 0,
        stepName: "Done",
        agentRole: null,
      });
      await runWithStepTracking(repo, {
        runId: "run-1",
        stepIndex: 0,
        stepName: "Done",
        agentRole: null,
        execute: () => Promise.resolve({ success: true }),
      });

      const executeSpy = vi.fn();
      const result = await runWithStepTracking(repo, {
        runId: "run-1",
        stepIndex: 0,
        stepName: "Done",
        agentRole: null,
        execute: executeSpy,
      });

      expect(executeSpy).not.toHaveBeenCalled();
      expect(result.execution.status).toBe("COMPLETED");
    });
  });
});
