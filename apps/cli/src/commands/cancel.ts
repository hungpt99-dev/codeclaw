import { access } from "node:fs/promises";
import { join } from "node:path";
import { openDatabase, initializeSchema, createRunRepository } from "@codeclaw/storage";

interface CancelOptions {
  reason?: string;
}

export async function cancelCommand(runId: string, options: CancelOptions): Promise<void> {
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

  const terminalStatuses = ["REPORT_GENERATED", "CANCELLED", "FAILED"];
  if (terminalStatuses.includes(run.status)) {
    console.log(`⚠️ Run ${runId} is already in terminal state: ${run.status}`);
    db.close();
    return;
  }

  runRepo.updateStatus(runId, "CANCELLED");

  console.log(`🛑 Run ${runId} cancelled${options.reason ? `: ${options.reason}` : ""}`);

  db.close();
}
