import { readFileSync } from "node:fs";
import { join } from "node:path";
import { configSchema } from "@codeclaw/shared";
import { generateJiraReadyMarkdown } from "@codeclaw/core";
import {
  getJiraStatus,
  testJiraConnection,
  createJiraIssue,
  createIssuesFromRun,
} from "@codeclaw/adapters";
import type { JiraConfig } from "@codeclaw/adapters";
import { getArtifactPaths } from "@codeclaw/core";
import { openDatabase, initializeSchema, createApprovalRepository } from "@codeclaw/storage";

function loadJiraConfig(): JiraConfig | null {
  try {
    const configPath = join(process.cwd(), ".codeclaw", "config.json");
    const rawContent = readFileSync(configPath, "utf-8");
    const raw: unknown = JSON.parse(rawContent);
    const parsed = configSchema.parse(raw);
    return parsed.integrations.jira;
  } catch {
    return null;
  }
}

function readArtifactFile(runDir: string, filename: string): string {
  try {
    return readFileSync(join(runDir, filename), "utf-8");
  } catch {
    return "";
  }
}

export function jiraStatusCommand(): void {
  const config = loadJiraConfig();
  if (!config) {
    console.log("Jira: Not configured (no config.json found)");
    return;
  }

  const status = getJiraStatus(config);
  console.log(`Jira Integration: ${status.enabled ? "Enabled" : "Disabled"}`);
  if (status.enabled) {
    console.log(`  Site URL: ${status.siteUrl ?? "Not configured"}`);
    console.log(`  Project Key: ${status.projectKey ?? "Not configured"}`);
    console.log(`  Token: ${status.hasToken ? "Set" : "Missing"}`);
    console.log(`  Status: ${status.overall}`);
  }
}

export async function jiraTestCommand(): Promise<void> {
  const config = loadJiraConfig();
  if (!config) {
    console.log("Error: Jira is not configured.");
    return;
  }

  if (!config.enabled) {
    console.log("Jira integration is not enabled.");
    return;
  }

  console.log("Testing Jira connection...");
  const result = await testJiraConnection(config);
  if (result.success) {
    console.log(`OK: ${result.message}`);
  } else {
    console.log(`Failed: ${result.message}`);
  }
}

export function jiraExportCommand(options: { run?: string }): void {
  const runId = options.run;
  if (!runId) {
    console.log("Error: --run <runId> is required");
    return;
  }

  const paths = getArtifactPaths(runId);

  const requirement = readArtifactFile(paths.requirementDir, "clarified-requirement.md");
  const acceptanceCriteria = readArtifactFile(paths.requirementDir, "acceptance-criteria.md");
  const taskBreakdown = readArtifactFile(paths.tasksDir, "task-breakdown.md");
  const technicalDesign = readArtifactFile(paths.designDir, "technical-design.md");
  const inputMd = readArtifactFile(paths.runDir, "input.md");

  const summary = requirement || inputMd;
  if (!summary) {
    console.log("Error: No run artifacts found. Run the workflow first.");
    return;
  }

  const jiraMd = generateJiraReadyMarkdown({
    title: `Run: ${runId}`,
    requirementSummary: summary.slice(0, 500),
    taskBreakdown,
    acceptanceCriteria,
    technicalDesign,
  });

  console.log("\n--- Jira-ready Markdown ---\n");
  console.log(jiraMd);
  console.log("\n--- End ---\n");
}

export async function jiraCreateCommand(options: {
  run?: string;
  approve?: boolean;
}): Promise<void> {
  const runId = options.run;
  if (!runId) {
    console.log("Error: --run <runId> is required");
    return;
  }

  const config = loadJiraConfig();
  if (!config?.enabled) {
    console.log("Error: Jira integration is not enabled.");
    return;
  }

  if (!config.projectKey) {
    console.log("Error: Jira project key is not configured.");
    return;
  }

  const safetyConfig = loadSafetyConfig();
  const requireApproval = safetyConfig?.requireApprovalBeforeExternalUpdate ?? true;
  const autoApprove = options.approve ?? !requireApproval;

  if (!autoApprove) {
    const aiTeamDir = join(process.cwd(), ".codeclaw");
    const db = openDatabase(join(aiTeamDir, "database.sqlite"));
    initializeSchema(db);
    const approvalRepo = createApprovalRepository(db);

    const approvalId = `${runId}_approval_external_update`;
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
      console.log("\n⚠️  Approval required: Creating Jira issues will modify your Jira project.");
      console.log(`   Project: ${config.projectKey}`);
      console.log(`   Site: ${config.siteUrl ?? "?"}`);
      console.log(`   To approve: codeclaw approve ${runId} --gate EXTERNAL_UPDATE`);
      console.log(`   To reject:  codeclaw reject ${runId} --gate EXTERNAL_UPDATE\n`);
      db.close();
      return;
    }

    db.close();
  }

  const paths = getArtifactPaths(runId);
  const requirement = readArtifactFile(paths.requirementDir, "clarified-requirement.md");
  const acceptanceCriteria = readArtifactFile(paths.requirementDir, "acceptance-criteria.md");
  const taskBreakdown = readArtifactFile(paths.tasksDir, "task-breakdown.md");
  const inputMd = readArtifactFile(paths.runDir, "input.md");
  const summary = requirement || inputMd;

  console.log("Creating Jira issues...");
  const results = await createIssuesFromRun(
    {
      title: `Run: ${runId}`,
      requirementSummary: summary.slice(0, 500),
      taskBreakdown,
      acceptanceCriteria,
    },
    config,
  );

  let successCount = 0;
  let failCount = 0;
  for (const r of results) {
    if (r.success) {
      console.log(`  ✓ Created: ${r.key ?? "?"} (${r.url ?? "?"})`);
      successCount++;
    } else {
      console.log(`  ✗ Failed: ${r.error ?? "Unknown error"}`);
      failCount++;
    }
  }

  console.log(`\nDone: ${String(successCount)} created, ${String(failCount)} failed`);
}

function loadSafetyConfig(): { requireApprovalBeforeExternalUpdate?: boolean } | null {
  try {
    const configPath = join(process.cwd(), ".codeclaw", "config.json");
    const rawContent = readFileSync(configPath, "utf-8");
    const raw: unknown = JSON.parse(rawContent);
    const parsed = configSchema.parse(raw);
    return parsed.safety;
  } catch {
    return null;
  }
}

export async function jiraCommentCommand(options: {
  run?: string;
  issue?: string;
  approve?: boolean;
}): Promise<void> {
  const runId = options.run;
  const issueKey = options.issue;

  if (!runId || !issueKey) {
    console.log("Error: --run <runId> and --issue <issueKey> are required");
    return;
  }

  const config = loadJiraConfig();
  if (!config?.enabled) {
    console.log("Error: Jira integration is not enabled.");
    return;
  }

  const safetyConfig = loadSafetyConfig();
  const requireApproval = safetyConfig?.requireApprovalBeforeExternalUpdate ?? true;
  const autoApprove = options.approve ?? !requireApproval;

  if (!autoApprove) {
    const aiTeamDir = join(process.cwd(), ".codeclaw");
    const db = openDatabase(join(aiTeamDir, "database.sqlite"));
    initializeSchema(db);
    const approvalRepo = createApprovalRepository(db);

    const approvalId = `${runId}_approval_external_update`;
    const existing = approvalRepo.findByRunIdAndGate(runId, "EXTERNAL_UPDATE");

    if (!existing) {
      approvalRepo.create({
        id: approvalId,
        runId,
        gate: "EXTERNAL_UPDATE",
        status: "PENDING",
      });
    }

    if (existing?.status !== "APPROVED") {
      console.log("\n⚠️  Approval required: Adding Jira comment will modify your Jira project.");
      console.log(`   Issue: ${issueKey}`);
      console.log(`   To approve: codeclaw approve ${runId} --gate EXTERNAL_UPDATE`);
      console.log(`   To reject:  codeclaw reject ${runId} --gate EXTERNAL_UPDATE\n`);
      db.close();
      return;
    }

    db.close();
  }

  const paths = getArtifactPaths(runId);
  const report = readArtifactFile(paths.reportDir, "final-report.md") || "No report available.";
  const summary = report.slice(0, 2000);

  const result = await createJiraIssue(
    {
      projectKey: config.projectKey ?? "",
      summary: `Comment on ${issueKey}`,
      description: `Workflow report:\n\n${summary}`,
      issueType: "Task",
    },
    config,
  );

  if (result.success) {
    console.log(`Comment added to ${issueKey}`);
  } else {
    console.log(`Failed: ${result.error ?? "Unknown"}`);
  }
}
