import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { checkStatus, testConnection, createPR, readCIRun, readPRStatus } from "@codeclaw/adapters";
import { generatePRSummary } from "@codeclaw/core";
import { getArtifactPaths } from "@codeclaw/core";
import { configSchema } from "@codeclaw/shared";
import { openDatabase, initializeSchema, createApprovalRepository } from "@codeclaw/storage";

interface GitHubOptions {
  run?: string;
  approve?: boolean;
}

function createReadline() {
  return createInterface({ input, output });
}

async function loadConfig(): Promise<unknown> {
  const configPath = join(process.cwd(), ".codeclaw", "config.json");
  const raw = await readFile(configPath, "utf-8");
  return JSON.parse(raw);
}

function createGateApprovalId(runId: string): string {
  return `${runId}_approval_external_update`;
}

export async function githubStatusCommand(): Promise<void> {
  try {
    const rawConfig = await loadConfig();
    const config = configSchema.parse(rawConfig);
    const ghConfig = config.integrations.github;

    if (!ghConfig.enabled) {
      console.log("\nGitHub Integration: DISABLED\n");
      console.log("  To enable, set integrations.github.enabled to true in config.");
      console.log("");
      return;
    }

    console.log("\nGitHub Integration Status\n");

    const status = await checkStatus({
      enabled: ghConfig.enabled,
      ...(ghConfig.owner ? { owner: ghConfig.owner } : {}),
      ...(ghConfig.repo ? { repo: ghConfig.repo } : {}),
    });

    console.log(`  gh CLI installed:     ${status.ghCliAvailable ? "YES" : "NO"}`);
    console.log(`  gh authenticated:     ${status.ghAuthenticated ? "YES" : "NO"}`);
    console.log(`  gh version:           ${status.ghVersion ?? "N/A"}`);

    if (status.currentRepo) {
      console.log(`  Current repo:         ${status.currentRepo.owner}/${status.currentRepo.repo}`);
    } else {
      console.log(`  Current repo:         Not detected`);
    }

    if (ghConfig.owner || ghConfig.repo) {
      console.log(`  Configured repo:      ${ghConfig.owner ?? "?"}/${ghConfig.repo ?? "?"}`);
    }

    console.log(
      `  Overall:              ${status.overall === "ok" ? "OK" : status.overall.toUpperCase()}`,
    );
    console.log("");
  } catch {
    console.error("\nError: Cannot read config. Ensure .codeclaw is initialized.\n");
    process.exit(1);
  }
}

export async function githubTestCommand(): Promise<void> {
  try {
    const rawConfig = await loadConfig();
    const config = configSchema.parse(rawConfig);
    const ghConfig = config.integrations.github;

    console.log("\nGitHub Connection Test\n");

    const result = await testConnection({
      enabled: ghConfig.enabled,
      ...(ghConfig.owner ? { owner: ghConfig.owner } : {}),
      ...(ghConfig.repo ? { repo: ghConfig.repo } : {}),
    });
    console.log(`  Status:   ${result.success ? "SUCCESS" : "FAILED"}`);
    console.log(`  Message:  ${result.message}`);
    console.log("");
  } catch {
    console.error("\nError: Cannot read config. Ensure .codeclaw is initialized.\n");
    process.exit(1);
  }
}

export async function githubPRCommand(action: string, options: GitHubOptions): Promise<void> {
  if (action === "create") {
    await githubPRCreateCommand(options);
  } else if (action === "view") {
    await githubPRViewCommand(options);
  } else {
    console.error(`\nUnknown action: ${action}. Use "create" or "view".\n`);
    process.exit(1);
  }
}

async function githubPRCreateCommand(options: GitHubOptions): Promise<void> {
  const runId = options.run;
  if (!runId) {
    console.error("\nError: --run <runId> is required\n");
    process.exit(1);
  }

  try {
    const rawConfig = await loadConfig();
    const config = configSchema.parse(rawConfig);

    const paths = getArtifactPaths(runId);

    const runRecord = {
      id: runId,
      title: `Run ${runId}`,
      requirement: "",
      mode: "docs-only",
      status: "REPORT_GENERATED",
    };

    const inputContent = await readFile(paths.inputFile, "utf-8").catch(() => "");
    runRecord.requirement = inputContent;
    runRecord.title = inputContent ? inputContent.slice(0, 80).replace(/\n/g, " ") : `Run ${runId}`;

    console.log("\nGenerating PR Summary...\n");

    const summary = await generatePRSummary(runId, paths, runRecord);

    console.log("PR Title:");
    console.log(`  ${summary.title}\n`);
    console.log("PR Body Preview:");
    console.log("──────────────────────────────────────────────────");
    console.log(summary.body.slice(0, 1500));
    if (summary.body.length > 1500) {
      console.log("...(truncated)");
    }
    console.log("──────────────────────────────────────────────────\n");

    const requireApproval = config.safety.requireApprovalBeforeExternalUpdate;
    const autoApprove = options.approve ?? !requireApproval;

    if (!autoApprove) {
      const aiTeamDir = join(process.cwd(), ".codeclaw");
      const db = openDatabase(join(aiTeamDir, "database.sqlite"));
      initializeSchema(db);
      const approvalRepo = createApprovalRepository(db);

      const approvalId = createGateApprovalId(runId);
      const existing = approvalRepo.findByRunIdAndGate(runId, "EXTERNAL_UPDATE");

      if (!existing) {
        approvalRepo.create({
          id: approvalId,
          runId,
          gate: "EXTERNAL_UPDATE",
          status: "PENDING",
        });
      }

      if (existing?.status === "APPROVED") {
        console.log("  ✅ EXTERNAL_UPDATE gate already approved.\n");
      } else {
        console.log("  ⚠️  Creating a GitHub PR requires approval.");
        console.log(`  Gate: EXTERNAL_UPDATE`);
        console.log(`  To approve: codeclaw approve ${runId} --gate EXTERNAL_UPDATE`);
        console.log(`  To reject:  codeclaw reject ${runId} --gate EXTERNAL_UPDATE\n`);

        const approved = await promptForApproval();
        if (!approved) {
          const pendingId = existing?.id ?? approvalId;
          approvalRepo.updateStatus(pendingId, "REJECTED");
          console.log("PR creation cancelled.\n");
          db.close();
          return;
        }
        approvalRepo.updateStatus(existing?.id ?? approvalId, "APPROVED");
      }

      db.close();
    }

    const result = await createPR({
      runId,
      title: summary.title,
      body: summary.body,
    });

    if (result.success) {
      console.log(`PR created: ${result.prUrl ?? ""}\n`);
    } else {
      console.error(`PR creation failed: ${result.error ?? "Unknown error"}\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

async function githubPRViewCommand(_options: GitHubOptions): Promise<void> {
  try {
    console.log("\nFetching PRs...\n");

    const prs = await readPRStatus();

    if (prs.length === 0) {
      console.log("  No open pull requests found.\n");
      return;
    }

    console.log("Open Pull Requests:\n");
    for (const pr of prs) {
      console.log(`  #${String(pr.number)} ${pr.title}`);
      console.log(`  State: ${pr.state}`);
      console.log(`  URL:   ${pr.url}\n`);
    }
  } catch (err) {
    console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

export async function githubActionsCommand(): Promise<void> {
  try {
    console.log("\nFetching CI/CD runs...\n");

    const runs = await readCIRun();

    if (runs.length === 0) {
      console.log("  No recent CI runs found.\n");
      return;
    }

    console.log("Recent CI Runs:\n");
    for (const run of runs) {
      console.log(`  Workflow:   ${run.workflow}`);
      console.log(`  Status:     ${run.status}`);
      console.log(`  Conclusion: ${run.conclusion || "in_progress"}`);
      console.log("");
    }
  } catch (err) {
    console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

async function promptForApproval(): Promise<boolean> {
  const rl = createReadline();
  try {
    const answer = await rl.question("Create this PR? This requires approval (y/N): ");
    return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
  } finally {
    rl.close();
  }
}
