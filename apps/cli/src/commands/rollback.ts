import { access } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createApprovalRepository,
} from "@codeclaw/storage";
import type { ApprovalGate } from "@codeclaw/shared";

interface RollbackOptions {
  dryRun?: boolean;
  yes?: boolean;
}

async function promptConfirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`${message} (y/N) `);
  rl.close();
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

function createGateApprovalId(runId: string): string {
  return `${runId}_approval_rollback`;
}

function getGitChangedFiles(workingDir: string): string[] {
  try {
    const diffOutput = execSync("git diff --name-only", { cwd: workingDir, encoding: "utf-8" });
    const stagedOutput = execSync("git diff --staged --name-only", {
      cwd: workingDir,
      encoding: "utf-8",
    });
    const untrackedOutput = execSync("git ls-files --others --exclude-standard", {
      cwd: workingDir,
      encoding: "utf-8",
    });

    const files = [
      ...diffOutput.trim().split("\n").filter(Boolean),
      ...stagedOutput.trim().split("\n").filter(Boolean),
      ...untrackedOutput.trim().split("\n").filter(Boolean),
    ];
    return [...new Set(files)];
  } catch {
    return [];
  }
}

function getGitDiff(workingDir: string): string {
  try {
    const diff = execSync("git diff --patch", { cwd: workingDir, encoding: "utf-8" });
    const staged = execSync("git diff --staged --patch", {
      cwd: workingDir,
      encoding: "utf-8",
    });
    return [diff, staged].filter(Boolean).join("\n").trim();
  } catch {
    return "";
  }
}

function performRollback(workingDir: string, files: string[]): void {
  const modified: string[] = [];
  const untracked: string[] = [];

  for (const file of files) {
    try {
      execSync(`git ls-files --error-unmatch "${file}"`, {
        cwd: workingDir,
        stdio: "pipe",
      });
      modified.push(file);
    } catch {
      untracked.push(file);
    }
  }

  if (modified.length > 0) {
    const filesArg = modified.map((f) => `"${f}"`).join(" ");
    execSync(`git checkout -- ${filesArg}`, { cwd: workingDir, stdio: "pipe" });
  }

  if (untracked.length > 0) {
    for (const file of untracked) {
      execSync(`rm "${file}"`, { cwd: workingDir, stdio: "pipe" });
    }
  }
}

export async function rollbackCommand(runId: string, options: RollbackOptions): Promise<void> {
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
  const approvalRepo = createApprovalRepository(db);

  const run = runRepo.findById(runId);
  if (!run) {
    console.log(`\n❌ Run not found: ${runId}\n`);
    db.close();
    process.exit(1);
  }

  const snapshotDir = join(aiTeamDir, ".snapshots");
  let hasSnapshot = false;
  try {
    await access(snapshotDir);
    hasSnapshot = true;
  } catch {
    hasSnapshot = false;
  }

  const workingDir = process.cwd();
  const changedFiles = getGitChangedFiles(workingDir);

  if (changedFiles.length === 0) {
    console.log(`\n✅ Working directory is clean. Nothing to roll back for ${runId}.\n`);
    db.close();
    return;
  }

  const diffContent = getGitDiff(workingDir);

  console.log(`\n⏪ Rollback Run: ${runId}`);
  console.log(`   Title: ${run.title}`);
  console.log(`   Has snapshot: ${hasSnapshot ? "Yes" : "No"}`);

  if (hasSnapshot) {
    console.log(`   Snapshot: ${snapshotDir}`);
  }

  console.log(`\n📄 Files to revert (${String(changedFiles.length)}):`);
  for (const file of changedFiles) {
    console.log(`   - ${file}`);
  }

  console.log(`\n📝 Diff preview:\n`);
  console.log(diffContent || "  (no diff content)");
  console.log("");

  if (options.dryRun) {
    console.log("  Dry run complete. Use without --dry-run to roll back.\n");
    db.close();
    return;
  }

  const rollbackGate: ApprovalGate = "ROLLBACK";
  const existingApproval = approvalRepo.findByRunIdAndGate(runId, rollbackGate);

  if (existingApproval?.status !== "APPROVED") {
    const approvalId = createGateApprovalId(runId);

    if (!existingApproval) {
      approvalRepo.create({
        id: approvalId,
        runId,
        gate: rollbackGate,
        status: "PENDING",
      });
    }

    if (options.yes) {
      approvalRepo.updateStatus(approvalId, "APPROVED");
      console.log("  ✅ ROLLBACK gate auto-approved (--yes).\n");
    } else {
      console.log(`  ⏸️  ROLLBACK approval gate created for run ${runId}.`);
      console.log(`  To approve: codeclaw approve ${runId} --gate ROLLBACK`);
      console.log(`  To reject:  codeclaw reject ${runId} --gate ROLLBACK`);
      console.log("");

      const confirmed = await promptConfirm(
        `⚠️  Roll back ${String(changedFiles.length)} file(s) for run ${runId}?`,
      );
      if (!confirmed) {
        approvalRepo.updateStatus(approvalId, "REJECTED");
        console.log("  Rollback cancelled.\n");
        db.close();
        process.exit(0);
      }
      approvalRepo.updateStatus(approvalId, "APPROVED");
    }
  } else {
    console.log("  ✅ ROLLBACK gate already approved.\n");
  }

  db.close();
  performRollback(workingDir, changedFiles);
  console.log(`\n✅ Rolled back ${String(changedFiles.length)} file(s) for run ${runId}.\n`);
}
