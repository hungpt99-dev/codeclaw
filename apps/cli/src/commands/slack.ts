import { readFileSync } from "node:fs";
import { join } from "node:path";
import { configSchema } from "@aiteam/shared";
import { getSlackStatus, testSlackConnection, notifySlack } from "@aiteam/adapters";
import type { SlackConfig } from "@aiteam/adapters";
import { getArtifactPaths, buildReportReadyMessage } from "@aiteam/core";
import type { SlackMessageInput } from "@aiteam/core";
import { openDatabase, initializeSchema, createApprovalRepository } from "@aiteam/storage";

function loadSlackConfig(): SlackConfig | null {
  try {
    const configPath = join(process.cwd(), ".ai-team", "config.json");
    const rawContent = readFileSync(configPath, "utf-8");
    const raw: unknown = JSON.parse(rawContent);
    const parsed = configSchema.parse(raw);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return parsed.integrations.slack as SlackConfig;
  } catch {
    return null;
  }
}

export function slackStatusCommand(): void {
  const config = loadSlackConfig();
  if (!config) {
    console.log("Slack: Not configured (no config.json found)");
    return;
  }

  const status = getSlackStatus(config);
  console.log(`Slack Integration: ${status.enabled ? "Enabled" : "Disabled"}`);
  if (status.enabled) {
    console.log(`  Channel ID: ${status.channelId ?? "Not configured"}`);
    console.log(`  Token: ${status.hasToken ? "Set" : "Missing"}`);
    console.log(`  Status: ${status.overall}`);
  }
}

export async function slackTestCommand(): Promise<void> {
  const config = loadSlackConfig();
  if (!config) {
    console.log("Error: Slack is not configured.");
    return;
  }

  if (!config.enabled) {
    console.log("Slack integration is not enabled.");
    return;
  }

  console.log("Testing Slack connection...");
  const result = await testSlackConnection(config);
  if (result.success) {
    console.log(`OK: ${result.message}`);
  } else {
    console.log(`Failed: ${result.message}`);
  }
}

function loadSafetyConfig(): { requireApprovalBeforeExternalUpdate?: boolean } | null {
  try {
    const configPath = join(process.cwd(), ".ai-team", "config.json");
    const rawContent = readFileSync(configPath, "utf-8");
    const raw: unknown = JSON.parse(rawContent);
    const parsed = configSchema.parse(raw);
    return parsed.safety;
  } catch {
    return null;
  }
}

export async function slackPostCommand(options: {
  run?: string;
  event?: string;
  approve?: boolean;
}): Promise<void> {
  const runId = options.run;
  if (!runId) {
    console.log("Error: --run <runId> is required");
    return;
  }

  const config = loadSlackConfig();
  if (!config?.enabled) {
    console.log("Error: Slack integration is not enabled.");
    return;
  }

  if (!config.channelId) {
    console.log("Error: Slack channel ID is not configured.");
    return;
  }

  const event = (options.event ?? "report_ready") as
    | "docs_generated"
    | "code_generated"
    | "test_passed"
    | "test_failed"
    | "report_ready";

  const paths = getArtifactPaths(runId);

  let reportContent = "";
  try {
    reportContent = readFileSync(join(paths.reportDir, "final-report.md"), "utf-8");
  } catch {
    reportContent = "";
  }

  const input: SlackMessageInput = {
    runTitle: `Run: ${runId}`,
    runId,
    status: "REPORT_GENERATED",
    artifactSummary: reportContent ? `Final report: ${reportContent.slice(0, 200)}...` : undefined,
  };

  if (event === "report_ready") {
    const text = buildReportReadyMessage(input);

    const safetyConfig = loadSafetyConfig();
    const requireApproval = safetyConfig?.requireApprovalBeforeExternalUpdate ?? true;
    const autoApprove = options.approve ?? !requireApproval;

    if (!autoApprove) {
      const aiTeamDir = join(process.cwd(), ".ai-team");
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
        console.log("\n⚠️  Approval required: Posting to Slack will send a message to your Slack.");
        console.log(`   Channel: #${config.channelId}`);
        console.log(`   Message preview:\n`);
        console.log(text);
        console.log(`\n   To approve: aiteam approve ${runId} --gate EXTERNAL_UPDATE`);
        console.log(`   To reject:  aiteam reject ${runId} --gate EXTERNAL_UPDATE\n`);
        db.close();
        return;
      }

      db.close();
    }

    const result = await notifySlack(config, event, text, true);
    if (result.success) {
      console.log(`Message posted to Slack (ts: ${result.ts ?? "?"})`);
    } else {
      console.log(`Failed: ${result.error ?? "Unknown"}`);
    }
  } else {
    console.log(`Event '${event}' posting not implemented via CLI yet. Use 'report_ready'.`);
  }
}
