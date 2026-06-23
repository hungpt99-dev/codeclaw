import { access } from "node:fs/promises";
import { join } from "node:path";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createApprovalRepository,
} from "@aiteam/storage";
import type { ApprovalGate } from "@aiteam/shared";

interface RejectOptions {
  gate?: string;
  reason?: string;
}

export async function rejectCommand(runId: string, options: RejectOptions): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".ai-team");

  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .ai-team not found. Run 'aiteam init' first.");
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

  const gate = (options.gate ?? "REQUIREMENT").toUpperCase() as ApprovalGate;
  const validGates: ApprovalGate[] = [
    "REQUIREMENT",
    "PLAN",
    "CODE_GENERATION",
    "RISKY_FILE",
    "EXTERNAL_UPDATE",
    "ROLLBACK",
  ];

  if (!validGates.includes(gate)) {
    console.log(`❌ Invalid gate: ${gate}. Valid gates: ${validGates.join(", ")}`);
    db.close();
    process.exit(1);
  }

  const approvalRepo = createApprovalRepository(db);
  const approvalId = `${runId}_approval_${gate.toLowerCase()}`;

  const existing = approvalRepo.findByRunIdAndGate(runId, gate);
  if (existing && existing.status !== "PENDING") {
    console.log(`⚠️ Gate ${gate} is already ${existing.status}.`);
    db.close();
    return;
  }

  if (existing) {
    if (options.reason) {
      approvalRepo.updateStatus(existing.id, "REJECTED", options.reason);
    } else {
      approvalRepo.updateStatus(existing.id, "REJECTED");
    }
  } else {
    const createInput: {
      id: string;
      runId: string;
      gate: ApprovalGate;
      status: "REJECTED";
      note?: string;
    } = {
      id: approvalId,
      runId,
      gate,
      status: "REJECTED",
    };
    if (options.reason) {
      createInput.note = options.reason;
    }
    approvalRepo.create(createInput);
  }

  runRepo.updateStatus(runId, "CANCELLED");

  console.log(`❌ Gate ${gate} rejected${options.reason ? `: ${options.reason}` : ""}`);
  console.log(`   Run ${runId} has been cancelled.`);

  db.close();
}
