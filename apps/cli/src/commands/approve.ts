import { access } from "node:fs/promises";
import { join } from "node:path";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createApprovalRepository,
} from "@codeclaw/storage";
import type { ApprovalGate } from "@codeclaw/shared";

interface ApproveOptions {
  gate?: string;
  note?: string;
}

export async function approveCommand(runId: string, options: ApproveOptions): Promise<void> {
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

  const gate = (options.gate ?? "REQUIREMENT").toUpperCase() as ApprovalGate;
  const validGates: ApprovalGate[] = [
    "SCOPE",
    "REQUIREMENT",
    "PLAN",
    "CODING_PLAN",
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
    if (options.note) {
      approvalRepo.updateStatus(existing.id, "APPROVED", options.note);
    } else {
      approvalRepo.updateStatus(existing.id, "APPROVED");
    }
  } else {
    const createInput: {
      id: string;
      runId: string;
      gate: ApprovalGate;
      status: "APPROVED";
      note?: string;
    } = {
      id: approvalId,
      runId,
      gate,
      status: "APPROVED",
    };
    if (options.note) {
      createInput.note = options.note;
    }
    approvalRepo.create(createInput);
  }

  if (gate === "SCOPE") {
    runRepo.updateStatus(runId, "SCOPE_GENERATED");
  } else if (gate === "REQUIREMENT") {
    runRepo.updateStatus(runId, "SPEC_GENERATED");
  } else if (gate === "PLAN") {
    const approval = approvalRepo.findByRunIdAndGate(runId, "REQUIREMENT");
    if (approval?.status === "APPROVED") {
      runRepo.updateStatus(runId, "PLAN_GENERATED");
    }
  }

  console.log(`✅ Gate ${gate} approved${options.note ? `: ${options.note}` : ""}`);
  console.log(`   Run: codeclaw resume ${runId} to continue`);

  db.close();
}
