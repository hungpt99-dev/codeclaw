import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveProjectDir } from "@codeclaw/core";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createArtifactRepository,
  createStepExecutionRepository,
} from "@codeclaw/storage";
import { execSync } from "node:child_process";

interface StatusOptions {
  run?: string;
  json?: boolean;
  project?: string;
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  let aiTeamDir: string;

  try {
    const resolved = await resolveProjectDir(options.project);
    aiTeamDir = resolved.projectDir;
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    } else {
      console.log(`❌ ${err instanceof Error ? err.message : String(err)}`);
    }
    process.exit(1);
  }

  const configPath = join(aiTeamDir, "config.json");
  let config: Record<string, unknown> = {};
  try {
    const raw = await readFile(configPath, "utf-8");
    config = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // config may not be readable
  }

  const dbPath = join(aiTeamDir, "database.sqlite");
  let db;
  try {
    db = openDatabase(dbPath);
    initializeSchema(db);
  } catch {
    if (options.json) {
      console.log(JSON.stringify({ error: "Cannot open database" }));
    } else {
      console.log("❌ Cannot open database. Run 'codeclaw init' first.");
    }
    process.exit(1);
  }

  const runRepo = createRunRepository(db);
  const artifactRepo = createArtifactRepository(db);

  if (options.run) {
    const run = runRepo.findById(options.run);
    if (!run) {
      if (options.json) {
        console.log(JSON.stringify({ error: `Run not found: ${options.run}` }));
      } else {
        console.log(`\n❌ Run not found: ${options.run}\n`);
      }
      db.close();
      process.exit(1);
    }
    const artifacts = artifactRepo.findByRunId(options.run);

    if (options.json) {
      db.close();
      console.log(JSON.stringify({ run, artifacts, config }, null, 2));
      return;
    }

    console.log(`\n📋 Run: ${run.id}`);
    console.log(`   Title: ${run.title}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Mode: ${run.mode}`);
    console.log(`   Created: ${new Date(run.createdAt).toLocaleString()}`);
    console.log(`   Updated: ${new Date(run.updatedAt).toLocaleString()}`);

    const stepRepo = createStepExecutionRepository(db);
    const steps = stepRepo.findByRunId(options.run);
    if (steps.length > 0) {
      console.log(`\n⏱️ Steps (${String(steps.length)}):`);
      for (const s of steps) {
        const statusIcon =
          s.status === "COMPLETED"
            ? "✅"
            : s.status === "RUNNING"
              ? "⏳"
              : s.status === "FAILED"
                ? "❌"
                : s.status === "SKIPPED"
                  ? "⏭️"
                  : "⏸️";
        const duration = s.durationMs !== null ? `(${formatDuration(s.durationMs)})` : "";
        const errorInfo =
          s.status === "FAILED" && s.errorMessage ? `: ${s.errorMessage.slice(0, 200)}` : "";
        console.log(
          `   ${statusIcon} Step ${String(s.stepIndex + 1)}/${String(steps.length)}: ${s.stepName}  ${duration}${errorInfo}`,
        );
      }
    }

    if (artifacts.length > 0) {
      console.log(`\n📄 Artifacts (${String(artifacts.length)}):`);
      for (const a of artifacts) {
        console.log(`   - [${a.type}] ${a.path || a.name}`);
      }
    }
    console.log("");
    db.close();
    return;
  }

  const recentRuns = runRepo.findRecent(5);
  db.close();

  const projectName = (config.project as Record<string, string> | undefined)?.name ?? "";
  const projectType = (config.project as Record<string, string> | undefined)?.type ?? "";

  let aiCliStatus = "Not checked";
  try {
    execSync("which claude", { stdio: "pipe" });
    aiCliStatus = "Available";
  } catch {
    aiCliStatus = "Not found";
  }

  let gitBranch = "";
  let gitClean = false;
  try {
    const branchResult = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" });
    gitBranch = branchResult.trim();
    const statusResult = execSync("git status --porcelain", { encoding: "utf-8" });
    gitClean = statusResult.trim().length === 0;
  } catch {
    gitBranch = "N/A";
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          project: { name: projectName, type: projectType },
          config,
          latestRun: recentRuns.length > 0 ? recentRuns[0] : null,
          recentRuns,
          git: { branch: gitBranch, clean: gitClean },
          aiCli: { claude: aiCliStatus },
          storage: {
            aiTeamDir,
            configPath,
            dbPath,
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log("\n📊 codeclaw Status\n");
  console.log(`  Project: ${projectName || "(not set)"}`);
  console.log(`  Type: ${projectType || "(not set)"}`);
  console.log(`  Git branch: ${gitBranch}${gitClean ? " (clean)" : " (dirty)"}`);
  console.log(`  Claude CLI: ${aiCliStatus}`);

  if (recentRuns.length > 0) {
    const latest = recentRuns[0];
    if (!latest) return;
    console.log(`\n  Latest run:`);
    console.log(`    ${latest.id}`);
    console.log(`    Title: ${latest.title}`);
    console.log(`    Status: ${latest.status}`);
    console.log(`    Created: ${new Date(latest.createdAt).toLocaleString()}`);
    if (recentRuns.length > 1) {
      console.log(`\n  Recent runs (${String(recentRuns.length)}):`);
      for (const r of recentRuns) {
        console.log(`    ${r.id} - ${r.status} - ${new Date(r.createdAt).toLocaleString()}`);
      }
    }
  } else {
    console.log("\n  No runs yet.");
  }

  console.log(`\n  Storage:`);
  console.log(`    Config: ${configPath}`);
  console.log(`    Database: ${dbPath}`);
  console.log(`    Runs: ${join(aiTeamDir, "runs")}`);
  console.log("");
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${String(minutes)}m ${String(remainingSeconds)}s`;
  }
  return `${String(remainingSeconds)}s`;
}
