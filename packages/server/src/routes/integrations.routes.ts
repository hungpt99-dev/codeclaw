import type { FastifyInstance } from "fastify";
import type { DbConnection } from "@codeclaw/storage";
import { createRunRepository, createApprovalRepository } from "@codeclaw/storage";
import {
  checkStatus,
  testConnection,
  createPR,
  readCIRun,
  readPRStatus,
  readPRDetail,
  getJiraStatus,
  testJiraConnection,
  createIssuesFromRun,
  getSlackStatus,
  testSlackConnection,
  notifySlack,
} from "@codeclaw/adapters";
import type { JiraConfig } from "@codeclaw/adapters";
import {
  generatePRSummary,
  getArtifactPaths,
  buildReportReadyMessage,
  buildDocsGeneratedMessage,
  buildCodeGeneratedMessage,
  buildTestResultMessage,
} from "@codeclaw/core";
import type { SlackMessageInput } from "@codeclaw/core";
import { configSchema } from "@codeclaw/shared";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export function registerIntegrationRoutes(app: FastifyInstance, _db: DbConnection): void {
  app.get("/api/integrations", async (_request, _reply) => {
    return {
      integrations: {
        github: {
          name: "GitHub",
          type: "gh-cli",
          optional: true,
        },
        jira: {
          name: "Jira",
          type: "api",
          optional: true,
        },
        slack: {
          name: "Slack",
          type: "api",
          optional: true,
        },
      },
    };
  });

  app.get("/api/integrations/github/status", async (_request, _reply) => {
    const config = { enabled: true, mode: "gh-cli" as const };
    const status = await checkStatus(config);
    return { status };
  });

  app.post("/api/integrations/github/test", async (_request, _reply) => {
    const config = { enabled: true, mode: "gh-cli" as const };
    const result = await testConnection(config);
    return result;
  });

  app.get("/api/integrations/github/prs", async (_request, _reply) => {
    const prs = await readPRStatus();
    return { prs };
  });

  app.get("/api/integrations/github/prs/:number", async (request, _reply) => {
    const params = request.params as { number: string };
    const pr = await readPRDetail(Number(params.number));
    return { pr };
  });

  app.get("/api/integrations/github/actions", async (_request, _reply) => {
    const runs = await readCIRun();
    return { runs };
  });

  app.post("/api/integrations/jira/test", async (_request, reply) => {
    try {
      const configPath = join(process.cwd(), ".codeclaw", "config.json");
      const raw = await readFile(configPath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      const cfg = configSchema.parse(parsed);
      const jiraConfig = cfg.integrations.jira as JiraConfig;
      const result = await testJiraConnection(jiraConfig);
      return result;
    } catch {
      return reply.status(400).send({ success: false, message: "Jira not configured" });
    }
  });

  app.get("/api/integrations/jira/status", async (_request, _reply) => {
    try {
      const configPath = join(process.cwd(), ".codeclaw", "config.json");
      const rawContent = await readFile(configPath, "utf-8");
      const parsedConfig: unknown = JSON.parse(rawContent);
      const cfg = configSchema.parse(parsedConfig);
      const jiraConfig = cfg.integrations.jira as JiraConfig;
      const status = getJiraStatus(jiraConfig);
      return { status };
    } catch {
      return {
        status: { enabled: false, configured: false, hasToken: false, overall: "not_configured" },
      };
    }
  });

  app.post("/api/integrations/jira/create", async (request, reply) => {
    const body = request.body as { runId?: string; approve?: boolean } | undefined;
    if (!body?.runId) {
      return reply.status(400).send({ error: "runId is required" });
    }
    if (!body.approve) {
      return reply.send({ message: "Approval required", gate: "EXTERNAL_UPDATE" });
    }
    try {
      const configPath = join(process.cwd(), ".codeclaw", "config.json");
      const rawConfig = await readFile(configPath, "utf-8");
      const parsedConfig: unknown = JSON.parse(rawConfig);
      const cfg = configSchema.parse(parsedConfig);
      const jiraConfig = cfg.integrations.jira as JiraConfig;

      const paths = getArtifactPaths(body.runId);
      const requirement = await readFile(
        join(paths.requirementDir, "clarified-requirement.md"),
        "utf-8",
      ).catch(() => "");
      const acceptanceCriteria = await readFile(
        join(paths.requirementDir, "acceptance-criteria.md"),
        "utf-8",
      ).catch(() => "");
      const taskBreakdown = await readFile(
        join(paths.tasksDir, "task-breakdown.md"),
        "utf-8",
      ).catch(() => "");

      const results = await createIssuesFromRun(
        {
          title: `Run: ${body.runId}`,
          requirementSummary: requirement.slice(0, 500),
          taskBreakdown,
          acceptanceCriteria,
        },
        jiraConfig,
      );

      return { success: true, results };
    } catch (e) {
      return reply
        .status(500)
        .send({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/integrations/jira/export", async (request, reply) => {
    const body = request.body as { runId?: string } | undefined;
    if (!body?.runId) {
      return reply.status(400).send({ error: "runId is required" });
    }
    try {
      const paths = getArtifactPaths(body.runId);
      const requirement = await readFile(
        join(paths.requirementDir, "clarified-requirement.md"),
        "utf-8",
      ).catch(() => "");
      const acceptanceCriteria = await readFile(
        join(paths.requirementDir, "acceptance-criteria.md"),
        "utf-8",
      ).catch(() => "");
      const taskBreakdown = await readFile(
        join(paths.tasksDir, "task-breakdown.md"),
        "utf-8",
      ).catch(() => "");
      const technicalDesign = await readFile(
        join(paths.designDir, "technical-design.md"),
        "utf-8",
      ).catch(() => "");

      const { generateJiraReadyMarkdown } = await import("@codeclaw/core");
      const markdown = generateJiraReadyMarkdown({
        title: `Run: ${body.runId}`,
        requirementSummary: requirement.slice(0, 500),
        taskBreakdown,
        acceptanceCriteria,
        technicalDesign,
      });

      return { success: true, markdown };
    } catch (e) {
      return reply
        .status(500)
        .send({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/integrations/github/pr", async (request, reply) => {
    const body = request.body as
      | {
          runId?: string;
          approve?: boolean;
        }
      | undefined;

    if (!body?.runId) {
      return reply.status(400).send({ error: "runId is required" });
    }

    const runRepo = createRunRepository(_db);
    const run = runRepo.findById(body.runId);
    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }

    const paths = getArtifactPaths(body.runId);
    const runRecord = {
      id: body.runId,
      title: run.title,
      requirement: run.rawRequirement,
      mode: run.mode,
      status: run.status,
    };

    const summary = await generatePRSummary(body.runId, paths, runRecord);

    const approvalRepo = createApprovalRepository(_db);
    const existingApproval = approvalRepo.findByRunIdAndGate(body.runId, "EXTERNAL_UPDATE");

    if (body.approve || existingApproval?.status === "APPROVED") {
      const result = await createPR({
        runId: body.runId,
        title: summary.title,
        body: summary.body,
      });

      if (!result.success) {
        return reply.status(500).send({ error: result.error ?? "PR creation failed" });
      }

      return { success: true, prUrl: result.prUrl, summary };
    }

    if (!existingApproval) {
      approvalRepo.create({
        id: `${body.runId}_approval_external_update`,
        runId: body.runId,
        gate: "EXTERNAL_UPDATE",
        status: "PENDING",
      });
    }

    return {
      message: "PR creation requires approval",
      gate: "EXTERNAL_UPDATE",
      summary,
      approval: existingApproval ?? {
        id: `${body.runId}_approval_external_update`,
        gate: "EXTERNAL_UPDATE",
        status: "PENDING",
      },
    };
  });

  app.post("/api/integrations/slack/test", async (_request, reply) => {
    try {
      const configPath = join(process.cwd(), ".codeclaw", "config.json");
      const raw = await readFile(configPath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      const cfg = configSchema.parse(parsed);
      const slackConfig = cfg.integrations.slack;
      const result = await testSlackConnection(slackConfig);
      return result;
    } catch {
      return reply.status(400).send({ success: false, message: "Slack not configured" });
    }
  });

  app.get("/api/integrations/slack/status", async (_request, _reply) => {
    try {
      const configPath = join(process.cwd(), ".codeclaw", "config.json");
      const rawContent = await readFile(configPath, "utf-8");
      const parsedConfig: unknown = JSON.parse(rawContent);
      const cfg = configSchema.parse(parsedConfig);
      const slackConfig = cfg.integrations.slack;
      const status = getSlackStatus(slackConfig);
      return { status };
    } catch {
      return {
        status: { enabled: false, configured: false, hasToken: false, overall: "not_configured" },
      };
    }
  });

  app.post("/api/integrations/slack/post", async (request, reply) => {
    const body = request.body as
      | {
          runId?: string;
          event?: string;
          approve?: boolean;
        }
      | undefined;

    if (!body?.runId) {
      return reply.status(400).send({ error: "runId is required" });
    }

    try {
      const configPath = join(process.cwd(), ".codeclaw", "config.json");
      const rawConfig = await readFile(configPath, "utf-8");
      const parsedConfig: unknown = JSON.parse(rawConfig);
      const cfg = configSchema.parse(parsedConfig);
      const slackConfig = cfg.integrations.slack;

      if (!slackConfig.enabled) {
        return await reply.status(400).send({ success: false, error: "Slack not enabled" });
      }

      if (!slackConfig.channelId) {
        return await reply
          .status(400)
          .send({ success: false, error: "Slack channel not configured" });
      }

      const event = (body.event ?? "report_ready") as
        | "docs_generated"
        | "code_generated"
        | "test_passed"
        | "test_failed"
        | "report_ready";

      if (!body.approve) {
        return await reply.send({
          success: false,
          error: "Approval required",
          gate: "EXTERNAL_UPDATE",
        });
      }

      const paths = getArtifactPaths(body.runId);
      const reportContent = await readFile(join(paths.reportDir, "final-report.md"), "utf-8").catch(
        () => "",
      );

      const input: SlackMessageInput = {
        runTitle: `Run: ${body.runId}`,
        runId: body.runId,
        status: "REPORT_GENERATED",
        artifactSummary: reportContent
          ? `Final report generated with ${String(reportContent.length)} characters`
          : undefined,
      };

      let text = "";
      switch (event) {
        case "docs_generated":
          text = buildDocsGeneratedMessage(input);
          break;
        case "code_generated":
          text = buildCodeGeneratedMessage(input);
          break;
        case "test_passed":
          text = buildTestResultMessage(input);
          break;
        case "test_failed":
          text = buildTestResultMessage(input);
          break;
        case "report_ready":
        default:
          text = buildReportReadyMessage(input);
          break;
      }

      const result = await notifySlack(slackConfig, event, text, true);
      return result;
    } catch (e) {
      return reply
        .status(500)
        .send({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });
}
