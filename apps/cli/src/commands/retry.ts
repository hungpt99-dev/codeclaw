import { access } from "node:fs/promises";
import { join } from "node:path";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createStepExecutionRepository,
} from "@codeclaw/storage";

interface RetryOptions {
  step: string;
}

export async function retryCommand(runId: string, options: RetryOptions): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".codeclaw");

  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .codeclaw not found. Run 'codeclaw init' first.");
    process.exit(1);
  }

  const db = openDatabase(join(aiTeamDir, "database.sqlite"));
  initializeSchema(db);

  const runRepo = createRunRepository(db);
  const run = runRepo.findById(runId);

  if (!run) {
    console.log(`❌ Run not found: ${runId}`);
    db.close();
    process.exit(1);
  }

  const stepIndex = Number(options.step);
  if (Number.isNaN(stepIndex) || stepIndex < 0) {
    console.log(`❌ Invalid step index: ${options.step}. Must be a non-negative number.`);
    db.close();
    process.exit(1);
  }

  const stepRepo = createStepExecutionRepository(db);
  const steps = stepRepo.findByRunId(runId);

  if (steps.length === 0) {
    console.log(`⚠️ Run ${runId} has no step records. Cannot retry.`);
    db.close();
    return;
  }

  const targetStep = steps.find((s) => s.stepIndex === stepIndex);
  if (!targetStep) {
    console.log(
      `❌ Step ${String(stepIndex)} not found for run ${runId}. Available steps: 0-${String(steps.length - 1)}`,
    );
    db.close();
    process.exit(1);
  }

  if (targetStep.status !== "FAILED") {
    console.log(
      `❌ Step ${String(stepIndex)} ("${targetStep.stepName}") is not failed (status: ${targetStep.status}). Only failed steps can be retried.`,
    );
    db.close();
    process.exit(1);
  }

  for (const step of steps) {
    if (step.stepIndex > stepIndex) {
      stepRepo.updateStatus(step.id, "SKIPPED");
    }
  }

  stepRepo.updateStatus(targetStep.id, "PENDING");

  console.log(
    `🔄 Reset step ${String(stepIndex)} ("${targetStep.stepName}") to PENDING for retry.`,
  );
  console.log(`   ${String(steps.length - stepIndex - 1)} subsequent step(s) marked as SKIPPED.`);
  console.log(`   Run: codeclaw resume ${runId} to continue from this step.`);

  db.close();
}
