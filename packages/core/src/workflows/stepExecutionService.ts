import { redactSecrets } from "@codeclaw/shared";
import type { StepExecution } from "@codeclaw/shared";

export interface StepExecutionRepo {
  findByRunIdAndStepIndex(runId: string, stepIndex: number): StepExecution | undefined;
  create(input: {
    id: string;
    runId: string;
    stepIndex: number;
    stepName: string;
    agentRole: string | null;
  }): StepExecution;
  updateStartedAt(id: string): StepExecution | undefined;
  updateComplete(
    id: string,
    status: "COMPLETED" | "FAILED",
    durationMs: number,
    errorMessage: string | null,
    outputArtifactPath: string | null,
  ): StepExecution | undefined;
}

export interface StepRunnerOptions {
  runId: string;
  stepIndex: number;
  stepName: string;
  agentRole: string | null;
  stepKind?: string;
  execute: () => Promise<{ success: boolean; error?: string; artifactPath?: string }>;
}

export interface StepRunnerResult {
  execution: StepExecution;
  stepOutput: { success: boolean; error?: string; artifactPath?: string };
}

export function createStepExecutionId(runId: string, stepIndex: number): string {
  return `${runId}_step_${String(stepIndex)}`;
}

export async function runWithStepTracking(
  repo: StepExecutionRepo,
  options: StepRunnerOptions,
): Promise<StepRunnerResult> {
  const stepId = createStepExecutionId(options.runId, options.stepIndex);

  const existing = repo.findByRunIdAndStepIndex(options.runId, options.stepIndex);
  if (!existing) {
    repo.create({
      id: stepId,
      runId: options.runId,
      stepIndex: options.stepIndex,
      stepName: options.stepName,
      agentRole: options.agentRole,
    });
  } else if (existing.status !== "PENDING") {
    return {
      execution: existing,
      stepOutput: { success: existing.status === "COMPLETED" },
    };
  }

  repo.updateStartedAt(stepId);

  const startTime = Date.now();

  try {
    const stepOutput = await options.execute();
    const durationMs = Date.now() - startTime;

    repo.updateComplete(
      stepId,
      stepOutput.success ? "COMPLETED" : "FAILED",
      durationMs,
      stepOutput.error ? redactSecrets(stepOutput.error) : null,
      stepOutput.artifactPath ?? null,
    );

    const updated = repo.findByRunIdAndStepIndex(options.runId, options.stepIndex);
    if (!updated) {
      throw new Error("Step execution record not found after update");
    }

    return { execution: updated, stepOutput };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : String(err);
    repo.updateComplete(stepId, "FAILED", durationMs, redactSecrets(message), null);

    const updated = repo.findByRunIdAndStepIndex(options.runId, options.stepIndex);
    if (!updated) {
      throw new Error("Step execution record not found after error");
    }

    return {
      execution: updated,
      stepOutput: { success: false, error: message },
    };
  }
}
