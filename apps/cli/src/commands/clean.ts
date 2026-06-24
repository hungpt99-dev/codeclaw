import { access, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

interface CleanOptions {
  runs?: boolean;
  logs?: boolean;
  all?: boolean;
  olderThan?: string;
  dryRun?: boolean;
  yes?: boolean;
}

function parseOlderThan(value: string): number {
  const regex = /^(\d+)\s*d(?:ays?)?$/i;
  const match = regex.exec(value);
  if (match?.[1] === undefined) {
    console.log(`❌ Invalid format: ${value}. Use e.g. "30d" or "30 days".`);
    process.exit(1);
  }
  return parseInt(match[1], 10);
}

function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

async function promptConfirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`${message} (y/N) `);
  rl.close();
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

export async function cleanCommand(options: CleanOptions): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".codeclaw");

  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .codeclaw not found. Run 'codeclaw init' first.");
    process.exit(1);
  }

  if (!options.runs && !options.logs && !options.all) {
    console.log("\n❌ Specify what to clean: --runs, --logs, or --all\n");
    process.exit(1);
  }

  const olderThanDays = options.olderThan
    ? parseOlderThan(options.olderThan)
    : options.all
      ? 90
      : options.runs
        ? 30
        : 7;

  const cutoffMs = Date.now() - daysToMs(olderThanDays);
  const cutoffDate = new Date(cutoffMs).toLocaleDateString();

  const runsDir = join(aiTeamDir, "runs");
  const deleteTargets: string[] = [];

  if (options.runs || options.all) {
    try {
      const runDirs = await readdir(runsDir);
      for (const dir of runDirs) {
        if (dir === ".gitkeep") continue;
        const dirPath = join(runsDir, dir);
        try {
          const dirStat = await stat(dirPath);
          if (dirStat.isDirectory() && dirStat.mtimeMs < cutoffMs) {
            deleteTargets.push(dirPath);
          }
        } catch {
          // skip unreadable entries
        }
      }
    } catch {
      // runs dir may not exist
    }
  }

  if (options.logs || options.all) {
    try {
      const runDirs = await readdir(runsDir);
      for (const dir of runDirs) {
        if (dir === ".gitkeep") continue;
        const logsDir = join(runsDir, dir, "logs");
        try {
          const logsStat = await stat(logsDir);
          if (logsStat.isDirectory() && logsStat.mtimeMs < cutoffMs) {
            deleteTargets.push(logsDir);
          }
        } catch {
          // logs dir may not exist for this run
        }
      }
    } catch {
      // runs dir may not exist
    }
  }

  if (deleteTargets.length === 0) {
    console.log(
      `\n🧹 Nothing to clean (older than ${String(olderThanDays)} days, before ${cutoffDate}).\n`,
    );
    return;
  }

  const dryRunLabel = options.dryRun ? " (DRY RUN - no changes)" : "";
  console.log(
    `\n🧹 Cleanup${dryRunLabel}: ${String(deleteTargets.length)} target(s) older than ${String(olderThanDays)} days (before ${cutoffDate})\n`,
  );

  for (const target of deleteTargets) {
    const targetStat = await stat(target);
    console.log(
      `  ${target} (${targetStat.isDirectory() ? "directory" : "file"}, last modified: ${new Date(targetStat.mtimeMs).toLocaleDateString()})`,
    );
  }
  console.log("");

  if (options.dryRun) {
    console.log("  Dry run complete. Use without --dry-run to delete.\n");
    return;
  }

  if (!options.yes) {
    const confirmed = await promptConfirm(`\n⚠️  Delete ${String(deleteTargets.length)} item(s)?`);
    if (!confirmed) {
      console.log("  Cancelled.\n");
      return;
    }
  }

  for (const target of deleteTargets) {
    try {
      await rm(target, { recursive: true, force: true });
      console.log(`  ✅ Deleted: ${target}`);
    } catch (e) {
      console.log(`  ❌ Failed to delete: ${target}${e instanceof Error ? ` (${e.message})` : ""}`);
    }
  }

  console.log("\n  Done.\n");
}
