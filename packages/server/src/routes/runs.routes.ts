import type { FastifyInstance } from "fastify";
import type { DbConnection } from "@aiteam/storage";
import { createRunRepository, createArtifactRepository } from "@aiteam/storage";
import type { ArtifactType, RunMode } from "@aiteam/shared";
import { createRunId, ArtifactTypeValues } from "@aiteam/shared";
import { runDocsOnlyWorkflow } from "@aiteam/core";

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

    const workflowResult = await runDocsOnlyWorkflow({
      requirement: rawRequirement,
      projectRoot: undefined,
      memoryContext: undefined,
    });

    const artifactRepo = createArtifactRepository(db);
    const artifactDefs: ArtifactDef[] = [
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
}
