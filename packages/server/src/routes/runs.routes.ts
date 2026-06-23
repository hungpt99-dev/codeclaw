import type { FastifyInstance } from "fastify";
import type { DbConnection } from "@aiteam/storage";
import {
  createRunRepository,
  createArtifactRepository,
  createApprovalRepository,
} from "@aiteam/storage";
import type { ArtifactType, RunMode, ApprovalGate, ApprovalStatus } from "@aiteam/shared";
import { createRunId, ArtifactTypeValues } from "@aiteam/shared";
import { runDocsOnlyWorkflow, runAssistedWorkflow, analyzeRepository } from "@aiteam/core";

interface ArtifactDef {
  type: ArtifactType;
  name: string;
  format: string;
}

export function registerRunsRoutes(app: FastifyInstance, db: DbConnection): void {
  app.get("/api/runs", async (_request, _reply) => {
    const repo = createRunRepository(db);
    const runs = repo.findAll();
    return { runs };
  });

  app.get("/api/runs/:id", async (request, reply) => {
    const repo = createRunRepository(db);
    const params = request.params as { id: string };
    const run = repo.findById(params.id);
    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }
    return { run };
  });

  app.post("/api/runs", async (request, reply) => {
    const body = request.body as
      | {
          requirement?: string;
          outputLanguage?: string;
          mode?: string;
        }
      | undefined;
    if (!body?.requirement || typeof body.requirement !== "string" || !body.requirement.trim()) {
      return reply.status(400).send({ error: "Requirement is required" });
    }

    const rawRequirement = body.requirement.trim();
    const outputLanguage = body.outputLanguage ?? "English";
    const mode = body.mode ?? "docs-only";
    const runId = createRunId(rawRequirement);

    const runRepo = createRunRepository(db);
    const existing = runRepo.findById(runId);
    if (existing) {
      return reply.status(409).send({ error: "Run already exists", runId });
    }

    const title = rawRequirement.length > 80 ? rawRequirement.slice(0, 80) + "..." : rawRequirement;
    runRepo.create({
      id: runId,
      title,
      rawRequirement,
      mode: mode as RunMode,
      outputLanguage,
    });

    runRepo.updateStatus(runId, "SPEC_GENERATED");

    const isAssisted = mode === "assisted";

    const workflowResult = isAssisted
      ? await runAssistedWorkflow({
          requirement: rawRequirement,
          projectRoot: undefined,
          memoryContext: undefined,
        })
      : await runDocsOnlyWorkflow({
          requirement: rawRequirement,
          projectRoot: undefined,
          memoryContext: undefined,
        });

    const artifactRepo = createArtifactRepository(db);

    const docsArtifactDefs: ArtifactDef[] = [
      { type: ArtifactTypeValues.RAW_REQUIREMENT, name: "input.md", format: "markdown" },
      {
        type: ArtifactTypeValues.CLARIFIED_REQUIREMENT,
        name: "clarified-requirement.md",
        format: "markdown",
      },
      { type: ArtifactTypeValues.BUSINESS_RULES, name: "business-rules.md", format: "markdown" },
      {
        type: ArtifactTypeValues.ACCEPTANCE_CRITERIA,
        name: "acceptance-criteria.md",
        format: "markdown",
      },
      { type: ArtifactTypeValues.OPEN_QUESTIONS, name: "open-questions.md", format: "markdown" },
      { type: ArtifactTypeValues.ASSUMPTIONS, name: "assumptions.md", format: "markdown" },
      {
        type: ArtifactTypeValues.TECHNICAL_DESIGN,
        name: "technical-design.md",
        format: "markdown",
      },
      { type: ArtifactTypeValues.API_DESIGN, name: "api-design.md", format: "markdown" },
      { type: ArtifactTypeValues.DB_DESIGN, name: "db-design.md", format: "markdown" },
      { type: ArtifactTypeValues.TASK_BREAKDOWN, name: "task-breakdown.md", format: "markdown" },
      { type: ArtifactTypeValues.TASK_BREAKDOWN, name: "task-breakdown.json", format: "json" },
      { type: ArtifactTypeValues.TEST_MATRIX, name: "test-matrix.md", format: "markdown" },
      { type: ArtifactTypeValues.TEST_MATRIX, name: "test-matrix.json", format: "json" },
      { type: ArtifactTypeValues.FINAL_REPORT, name: "final-report.md", format: "markdown" },
    ];

    const assistedArtifactDefs: ArtifactDef[] = [
      {
        type: ArtifactTypeValues.IMPLEMENTATION_PROMPT,
        name: "implementation-prompt.md",
        format: "markdown",
      },
    ];

    const artifactDefs = isAssisted
      ? [...docsArtifactDefs, ...assistedArtifactDefs]
      : docsArtifactDefs;

    for (let i = 0; i < artifactDefs.length; i++) {
      const def = artifactDefs[i];
      if (!def) continue;
      const artifactPath = workflowResult.artifacts[i];
      if (!artifactPath) continue;
      artifactRepo.create({
        id: `${runId}_artifact_${String(i)}`,
        runId,
        type: def.type,
        name: def.name,
        path: artifactPath,
        format: def.format,
      });
    }

    runRepo.updateStatus(runId, "REPORT_GENERATED");

    const run = runRepo.findById(runId);
    return { run };
  });

  app.post("/api/runs/:id/analyze", async (request, reply) => {
    const params = request.params as { id: string };
    const runRepo = createRunRepository(db);
    const run = runRepo.findById(params.id);
    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }

    const analysis = await analyzeRepository(process.cwd());
    return { analysis };
  });

  app.get("/api/runs/:id/approvals", async (request, _reply) => {
    const params = request.params as { id: string };
    const approvalRepo = createApprovalRepository(db);
    const approvals = approvalRepo.findByRunId(params.id);
    return { approvals };
  });

  app.post("/api/runs/:id/approvals", async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as
      | {
          gate?: string;
          status?: string;
          note?: string;
        }
      | undefined;

    const validGates: ApprovalGate[] = [
      "REQUIREMENT",
      "PLAN",
      "CODE_GENERATION",
      "RISKY_FILE",
      "EXTERNAL_UPDATE",
      "ROLLBACK",
    ];

    if (!body) {
      return reply.status(400).send({ error: "gate and status are required" });
    }

    if (!body.gate || !body.status) {
      return reply.status(400).send({ error: "gate and status are required" });
    }

    const gate = body.gate.toUpperCase() as ApprovalGate;
    const status = body.status.toUpperCase() as ApprovalStatus;

    if (!validGates.includes(gate)) {
      return reply.status(400).send({ error: `Invalid gate: ${gate}` });
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return reply.status(400).send({ error: "status must be APPROVED or REJECTED" });
    }

    const approvalRepo = createApprovalRepository(db);
    const runRepo = createRunRepository(db);
    const run = runRepo.findById(params.id);
    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }

    const existing = approvalRepo.findByRunIdAndGate(params.id, gate);
    if (existing) {
      const updated = body.note
        ? approvalRepo.updateStatus(existing.id, status, body.note)
        : approvalRepo.updateStatus(existing.id, status);
      if (status === "REJECTED") {
        runRepo.updateStatus(params.id, "CANCELLED");
      }
      return { approval: updated };
    }

    const approvalId = `${params.id}_approval_${gate.toLowerCase()}`;
    const approvalInput: {
      id: string;
      runId: string;
      gate: ApprovalGate;
      status: ApprovalStatus;
      note?: string;
    } = {
      id: approvalId,
      runId: params.id,
      gate,
      status,
    };
    if (body.note) {
      approvalInput.note = body.note;
    }
    const approval = approvalRepo.create(approvalInput);

    if (status === "REJECTED") {
      runRepo.updateStatus(params.id, "CANCELLED");
    }

    return { approval };
  });
}
