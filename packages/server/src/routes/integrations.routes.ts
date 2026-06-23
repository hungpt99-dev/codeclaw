import type { FastifyInstance } from "fastify";
import type { DbConnection } from "@aiteam/storage";
import { createRunRepository, createApprovalRepository } from "@aiteam/storage";
import {
  checkStatus,
  testConnection,
  createPR,
  readCIRun,
  readPRStatus,
  readPRDetail,
} from "@aiteam/adapters";
import { generatePRSummary, getArtifactPaths } from "@aiteam/core";

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
}
