/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unnecessary-condition */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import type { DbConnection } from "@codeclaw/storage";
import {
  createRunRepository,
  createArtifactRepository,
  createApprovalRepository,
  createTraceabilityRepository,
} from "@codeclaw/storage";
import { exportRunArtifacts } from "@codeclaw/adapters";
import type {
  ArtifactType,
  RunMode,
  RunStatus,
  ApprovalGate,
  ApprovalStatus,
  AiAdapterName,
} from "@codeclaw/shared";
import { createRunId } from "@codeclaw/shared";
import { createRunRequestSchema } from "@codeclaw/shared";
import {
  getArtifactPaths,
  runTestsForRun,
} from "@codeclaw/core";

export function registerRunsRoutes(
  app: FastifyInstance,
  db: DbConnection,
  codeclawDir?: string,
  dataDir?: string,
): void {
  const configPath = codeclawDir
    ? join(codeclawDir, "config.json")
    : join(".codeclaw", "config.json");
  app.get("/api/runs", async (request, _reply) => {
    const query = request.query as { projectId?: string };
    const repo = createRunRepository(db);
    let runs = repo.findAllWithProject(query.projectId);
    const { createStepExecutionRepository } = await import("@codeclaw/storage");
    const stepRepo = createStepExecutionRepository(db);
    const runsWithSteps = runs.map((run) => {
      const steps = stepRepo.findByRunId(run.id);
      const completedSteps = steps.filter((s) => s.status === "COMPLETED").length;
      const failedSteps = steps.filter((s) => s.status === "FAILED").length;
      const skippedSteps = steps.filter((s) => s.status === "SKIPPED").length;
      return {
        ...run,
        totalSteps: steps.length,
        completedSteps,
        failedSteps,
        skippedSteps,
      };
    });
    return { runs: runsWithSteps };
  });

  app.get("/api/runs/:id", async (request, reply) => {
    const repo = createRunRepository(db);
    const params = request.params as { id: string };
    const query = request.query as { projectId?: string };
    const run = repo.findById(params.id);
    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }
    if (query.projectId && run.projectId && run.projectId !== query.projectId) {
      return reply.status(404).send({ error: "Run not found in this project" });
    }
    return { run };
  });

    app.post("/api/runs", async (request, reply) => {
    const result = createRunRequestSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: "Requirement is required" });
    }

    const rawRequirement = (result.data.requirement ?? result.data.rawRequirement ?? "").trim();
    if (!rawRequirement) {
      return reply.status(400).send({ error: "Requirement is required" });
    }

    const outputLanguage = result.data.outputLanguage;
    const mode = result.data.mode;
    const body = request.body as Record<string, unknown> | undefined;
    const projectId = (body?.projectId as string | undefined);
    const workflowTemplateId = (body?.workflowTemplateId as string | undefined);

    // Create run record synchronously
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
      projectId,
      workflowTemplateId,
      workflowMode: mode,
    });

    runRepo.updateStatus(runId, "SPEC_GENERATED");
    const run = runRepo.findById(runId);

    // Run workflow in background
    setTimeout(() => {
      void (async () => {
        try {
          const { executeRun } = await import("@codeclaw/core");
          await executeRun({
            projectId,
            requirement: rawRequirement,
            workflowMode: mode ?? "docs-only",
            workflowTemplateId,
            outputLanguage,
            approve: (body?.approve as boolean) ?? false,
            agent: body?.agent as string | undefined,
            dataDirOverride: dataDir ?? codeclawDir,
          } as unknown as Parameters<typeof executeRun>[0]);
        } catch { /* background workflow execution */ }
      })();
    }, 0);

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
      "SCOPE",
      "REQUIREMENT",
      "PLAN",
      "CODING_PLAN",
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

  app.post("/api/runs/:id/code", async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as
      | {
          agent?: string;
          approved?: boolean;
        }
      | undefined;

    const runRepo = createRunRepository(db);
    const run = runRepo.findById(params.id);
    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }

    const agent: AiAdapterName = (body?.agent ?? "claude") as AiAdapterName;

    const approvalRepo = createApprovalRepository(db);
    const existingApproval = approvalRepo.findByRunIdAndGate(params.id, "CODE_GENERATION");

    if (body?.approved || existingApproval?.status === "APPROVED") {
      runRepo.updateStatus(params.id, "CODING");

      const result = await runSemiAutoWorkflow({
        requirement: run.rawRequirement,
        projectRoot: process.cwd(),
        selectedAgent: agent,
        memoryContext: undefined,
        approvalConfig: { requireCodeApproval: false },
      });

      runRepo.updateStatus(params.id, result.status as RunStatus);

      return {
        codeGeneration: result.codeGenerationResult ?? {
          success: false,
          changedFiles: [],
          diffPatchPath: "",
          agentLogPath: "",
        },
        fixLoopResult: result.fixLoopResult ?? null,
      };
    }

    if (existingApproval) {
      return reply.status(400).send({
        error: "Approval already exists",
        approval: existingApproval,
      });
    }

    const approvalId = `${params.id}_approval_code_generation`;
    approvalRepo.create({
      id: approvalId,
      runId: params.id,
      gate: "CODE_GENERATION",
      status: "PENDING",
    });

    runRepo.updateStatus(params.id, "WAITING_FOR_CODE_APPROVAL");

    return {
      message: "Code generation approval required",
      gate: "CODE_GENERATION",
      approval: { id: approvalId, gate: "CODE_GENERATION", status: "PENDING" },
    };
  });

  app.get("/api/runs/:id/diff", async (request, reply) => {
    const params = request.params as { id: string };
    const query = request.query as { projectId?: string };
    const runRepo = createRunRepository(db);
    const run = runRepo.findById(params.id);
    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }
    if (query.projectId && run.projectId && run.projectId !== query.projectId) {
      return reply.status(404).send({ error: "Run not found in this project" });
    }
    const paths = getArtifactPaths(params.id, dataDir);
    try {
      const content = await readFile(paths.diffPatchPath, "utf-8");
      return { diffContent: content };
    } catch {
      return reply.status(404).send({ error: "Diff patch not found" });
    }
  });

  app.get("/api/runs/:id/changed-files", async (request, reply) => {
    const params = request.params as { id: string };
    const paths = getArtifactPaths(params.id);
    try {
      const content = await readFile(paths.changedFilesPath, "utf-8");
      const parsed: { files: string[] } = JSON.parse(content) as { files: string[] };
      return {
        changedFiles: parsed.files.map((f: string) => ({ file: f, status: "modified" })),
      };
    } catch {
      return reply.status(404).send({ error: "Changed files not found" });
    }
  });

  app.get("/api/runs/:id/implementation-prompt", async (request, reply) => {
    const params = request.params as { id: string };
    const paths = getArtifactPaths(params.id);
    try {
      const content = await readFile(paths.implementationPromptPath, "utf-8");
      return { prompt: content };
    } catch {
      return reply.status(404).send({ error: "Implementation prompt not found" });
    }
  });

  app.get("/api/runs/:id/agent-log", async (request, reply) => {
    const params = request.params as { id: string };
    const paths = getArtifactPaths(params.id);
    try {
      const content = await readFile(paths.agentLogPath, "utf-8");
      return { log: content };
    } catch {
      return reply.status(404).send({ error: "Agent log not found" });
    }
  });

  app.get("/api/runs/:id/traceability", async (request, reply) => {
    const params = request.params as { id: string };
    const runRepo = createRunRepository(db);
    const run = runRepo.findById(params.id);
    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }

    const traceRepo = createTraceabilityRepository(db);
    const records = traceRepo.findByRunId(params.id);

    if (records.length === 0) {
      return reply.status(404).send({ error: "No traceability data found for this run" });
    }

    const summary = traceRepo.getSummary(params.id);
    const traceabilityMatrix = {
      runId: params.id,
      items: records.map((r) => ({
        requirementId: r.requirementId,
        requirementText: r.requirementText,
        acceptanceCriteriaIds: r.acceptanceCriteriaIds,
        taskIds: r.taskIds,
        codeFiles: r.codeFiles,
        testCases: r.testCases,
        testResults: r.testResults,
        status: r.status,
      })),
      generatedAt: new Date().toISOString(),
      summary,
    };

    return { traceability: traceabilityMatrix };
  });

  app.post("/api/runs/:id/traceability", async (request, reply) => {
    const params = request.params as { id: string };
    const runRepo = createRunRepository(db);
    const run = runRepo.findById(params.id);
    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }

    const paths = getArtifactPaths(params.id);
    const matrix = await generateTraceability(params.id, paths);

    const traceRepo = createTraceabilityRepository(db);
    traceRepo.deleteByRunId(params.id);

    for (const item of matrix.items) {
      traceRepo.create({
        id: `${params.id}_trace_${item.requirementId}`,
        runId: params.id,
        requirementId: item.requirementId,
        requirementText: item.requirementText,
        acceptanceCriteriaIds: item.acceptanceCriteriaIds,
        taskIds: item.taskIds,
        codeFiles: item.codeFiles,
        testCases: item.testCases,
        testResults: item.testResults,
        status: item.status,
      });
    }

    const summary = traceRepo.getSummary(params.id);

    return {
      traceability: {
        ...matrix,
        summary,
      },
    };
  });

  app.post("/api/runs/:id/test", async (_request, reply) => {
    const params = _request.params as { id: string };

    const runRepo = createRunRepository(db);
    const run = runRepo.findById(params.id);
    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }

    let config: {
      commands?: { build?: string; unitTest?: string; integrationTest?: string; lint?: string };
    };
    try {
      const { readFile: rf } = await import("node:fs/promises");
      const raw = await rf(configPath, "utf-8");
      config = JSON.parse(raw) as typeof config;
    } catch {
      return reply.status(500).send({ error: "Failed to load config" });
    }

    const commands = config.commands ?? { build: "", unitTest: "", integrationTest: "", lint: "" };

    const result = await runTestsForRun({
      runId: params.id,
      commands: {
        build: commands.build ?? "",
        unitTest: commands.unitTest ?? "",
        integrationTest: commands.integrationTest ?? "",
        lint: commands.lint ?? "",
      },
      cwd: process.cwd(),
      timeoutSeconds: 300,
    });

    runRepo.updateStatus(
      params.id,
      result.overallStatus === "PASSED" ? "TEST_PASSED" : "TEST_FAILED",
    );

    return { testRun: { overallStatus: result.overallStatus, results: result.results } };
  });

  app.get("/api/runs/:id/test-result", async (request, reply) => {
    const params = request.params as { id: string };
    const paths = getArtifactPaths(params.id);
    try {
      const content = await readFile(paths.testResultPath, "utf-8");
      return { testResult: content };
    } catch {
      return reply.status(404).send({ error: "Test result not found" });
    }
  });

  app.get("/api/runs/:id/failed-tests", async (request, reply) => {
    const params = request.params as { id: string };
    const paths = getArtifactPaths(params.id);
    try {
      const content = await readFile(paths.failedTestsPath, "utf-8");
      return { failedTests: content };
    } catch {
      return reply.status(404).send({ error: "Failed tests not found" });
    }
  });

  app.post("/api/runs/:id/review", async (request, reply) => {
    const params = request.params as { id: string };
    const runRepo = createRunRepository(db);
    const run = runRepo.findById(params.id);
    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }

    const result = await loadAndReview(params.id);
    const persisted = await persistReview(params.id, result);

    runRepo.updateStatus(
      params.id,
      result.overallStatus === "CHANGES_REQUIRED" ? "REVIEW_FAILED" : "REVIEW_PASSED",
    );

    return {
      review: {
        overallStatus: result.overallStatus,
        reviewReportPath: persisted.reviewReportPath,
        securityReviewPath: persisted.securityReviewPath,
        requirementCoveragePath: persisted.requirementCoveragePath,
      },
    };
  });

  app.get("/api/runs/:id/review", async (request, reply) => {
    const params = request.params as { id: string };
    const paths = getArtifactPaths(params.id);
    try {
      const { readFile: rf } = await import("node:fs/promises");
      const [reviewReport, securityReview, requirementCoverage] = await Promise.all([
        rf(paths.reviewReportPath, "utf-8").catch(() => ""),
        rf(paths.securityReviewPath, "utf-8").catch(() => ""),
        rf(paths.requirementCoveragePath, "utf-8").catch(() => ""),
      ]);

      if (!reviewReport && !securityReview && !requirementCoverage) {
        return await reply.status(404).send({ error: "Review artifacts not found" });
      }

      return { review: { reviewReport, securityReview, requirementCoverage } };
    } catch {
      return await reply.status(404).send({ error: "Review artifacts not found" });
    }
  });

  app.post("/api/runs/:id/export", async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as
      | {
          format?: string;
          includeLogs?: boolean;
          includeDiff?: boolean;
          title?: string;
          author?: string;
        }
      | undefined;

    const runRepo = createRunRepository(db);
    const run = runRepo.findById(params.id);
    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }

    const artifactRepo = createArtifactRepository(db);
    const dbArtifacts = artifactRepo.findByRunId(params.id);

    const artifacts = dbArtifacts.map((a) => ({
      id: a.id,
      runId: a.runId,
      type: a.type,
      name: a.name,
      path: a.path,
      format: a.format,
    }));

    const format = (body?.format ?? "html") as
      | "markdown"
      | "html"
      | "docx"
      | "pdf"
      | "zip"
      | "combined-md"
      | "json"
      | "all";

    const defaultDir = join(process.cwd(), ".codeclaw", "runs", params.id, "export");
    let outputPath: string;
    if (format === "combined-md") {
      outputPath = join(defaultDir, "combined-report.md");
    } else if (format === "json") {
      outputPath = join(defaultDir, "delivery-package.json");
    } else if (format === "all") {
      outputPath = join(defaultDir, "delivery-package");
    } else if (format === "markdown") {
      outputPath = join(defaultDir, "markdown");
    } else {
      outputPath = join(defaultDir, `report.${format}`);
    }

    const exportOpts: Parameters<typeof exportRunArtifacts>[2] = {
      format,
      outputPath,
    };
    if (body?.includeLogs) exportOpts.includeLogs = body.includeLogs;
    if (body?.includeDiff) exportOpts.includeDiff = body.includeDiff;
    if (body?.title) exportOpts.docTitle = body.title;
    if (body?.author) exportOpts.docAuthor = body.author;
    if (!body?.title) exportOpts.docTitle = run.title;

    const result = await exportRunArtifacts(params.id, artifacts, exportOpts);

    if (!result.success) {
      return reply.status(500).send({ error: result.error ?? "Export failed" });
    }

    return {
      success: true,
      outputPath: result.outputPath,
      format: result.format,
      fileSize: result.fileSize,
    };
  });

  app.get("/api/runs/:id/steps", async (request, reply) => {
    const params = request.params as { id: string };
    const query = request.query as { projectId?: string };
    const runRepo = createRunRepository(db);
    const run = runRepo.findById(params.id);
    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }
    if (query.projectId && run.projectId && run.projectId !== query.projectId) {
      return reply.status(404).send({ error: "Run not found in this project" });
    }
    const { createStepExecutionRepository } = await import("@codeclaw/storage");
    const stepRepo = createStepExecutionRepository(db);
    const steps = stepRepo.findByRunId(params.id);
    return { steps };
  });

  app.get("/api/runs/:id/execution-report", async (request, reply) => {
    const params = request.params as { id: string };
    const query = request.query as { projectId?: string };
    const runRepo = createRunRepository(db);
    const run = runRepo.findById(params.id);
    if (!run) {
      return reply.status(404).send({ error: "Run not found" });
    }
    if (query.projectId && run.projectId && run.projectId !== query.projectId) {
      return reply.status(404).send({ error: "Run not found in this project" });
    }
    const paths = getArtifactPaths(params.id, dataDir);
    const reportPath = paths.opencodeExecutionReportPath;
    if (!reportPath) {
      return reply.status(404).send({ error: "Execution report not found" });
    }
    try {
      const content = await readFile(reportPath, "utf-8");
      return { report: content };
    } catch {
      return reply.status(404).send({ error: "Execution report not found" });
    }
  });
}
