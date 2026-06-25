/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unnecessary-condition */
import { createRunId, nowIso } from "@codeclaw/shared";
import type { AgentBackendConfig, WorkflowTemplate } from "@codeclaw/shared";
import { resolveProjectContext } from "../project/projectContextResolver.js";
import { runDocsOnlyWorkflow } from "./docsOnlyWorkflow.js";
import { runAssistedWorkflow } from "./assistedWorkflow.js";
import { runSemiAutoWorkflow } from "./semiAutoWorkflow.js";
import { runCustomWorkflow, validateWorkflowTemplateSteps } from "./customWorkflowRunner.js";
import { loadRegistry } from "../project/projectRegistry.js";
import type { ResolveContextOptions } from "../project/projectContextResolver.js";
interface WorkflowTemplateRecord {
  id: string;
  projectId: string | null;
  name: string;
  description: string | null;
  steps: string;
  isDefault: number;
  createdAt: string;
  updatedAt: string;
}

export interface RunExecutionStorage {
  openDatabase(dbPath: string): unknown;
  initializeSchema(db: unknown): void;
  createRunRepository(db: unknown): {
    create(input: Record<string, unknown>): unknown;
    findById(id: string): unknown;
    updateStatus(id: string, status: string): unknown;
  };
  createArtifactRepository(db: unknown): {
    create(input: Record<string, unknown>): unknown;
  };
  createApprovalRepository(db: unknown): {
    create(input: Record<string, unknown>): unknown;
  };
  createWorkflowTemplateRepository(db: unknown): {
    findById(id: string): WorkflowTemplateRecord | undefined;
  };
}

export interface RunExecutionInput {
  projectId?: string;
  requirement: string;
  workflowMode: string;
  workflowTemplateId?: string;
  title?: string;
  outputLanguage?: string;
  agent?: string;
  approve?: boolean;
  timeout?: number;
  /** Override dataDir - skips project context resolution */
  dataDirOverride?: string;
  /** Override projectRoot */
  projectRootOverride?: string;
}

export interface RunExecutionResult {
  runId: string;
  status: string;
  artifacts: string[];
  createdAt: string;
  completedAt: string;
  projectId: string | undefined;
  workflowTemplateId: string | undefined;
  error?: string;
}

let _storage: RunExecutionStorage | undefined;

export function setRunExecutionStorage(storage: RunExecutionStorage): void {
  _storage = storage;
}

function getStorage(): RunExecutionStorage {
  if (!_storage) {
    throw new Error("Run execution storage not initialized. Call setRunExecutionStorage() first.");
  }
  return _storage;
}

export async function executeRun(input: RunExecutionInput): Promise<RunExecutionResult> {
  const storage = getStorage();

  let projectCtx;

  if (input.dataDirOverride) {
    // Use overridden data dir directly (server mode with known project)
    projectCtx = {
      projectId: input.projectId,
      projectName: undefined,
      projectRoot: input.projectRootOverride ?? process.cwd(),
      dataDir: input.dataDirOverride,
      configPath: joinPath(input.dataDirOverride, "config.json"),
      databasePath: joinPath(input.dataDirOverride, "database.sqlite"),
      runsDir: joinPath(input.dataDirOverride, "runs"),
      artifactsDir: joinPath(input.dataDirOverride, "runs"),
      memoryDir: joinPath(input.dataDirOverride, "memory"),
      exportsDir: joinPath(input.dataDirOverride, "exports"),
      logsDir: joinPath(input.dataDirOverride, "logs"),
      workflowTemplatesDir: joinPath(input.dataDirOverride, "workflow-templates"),
      resolvedVia: "explicit" as const,
    };
  } else {
    try {
      const registry = await loadRegistry();
      const activeId = registry.activeProjectId;
      const explicitProjectId = input.projectId ?? activeId;
      projectCtx = await resolveProjectContext({
        projectNameOrId: explicitProjectId,
      } as unknown as ResolveContextOptions);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        runId: "",
        status: "FAILED",
        artifacts: [],
        createdAt: nowIso(),
        completedAt: nowIso(),
        projectId: input.projectId,
        workflowTemplateId: input.workflowTemplateId,
        error: message,
      };
    }
  }

  const dataDir = projectCtx.dataDir;
  const dbPath = projectCtx.databasePath;
  const db = storage.openDatabase(dbPath);
  storage.initializeSchema(db);

  const runId = createRunId(input.requirement);
  const title = input.title ?? input.requirement.slice(0, 80);

  const runRepo = storage.createRunRepository(db);
  const artifactRepo = storage.createArtifactRepository(db);
  const approvalRepo = storage.createApprovalRepository(db);

  const mode = input.workflowMode ?? "docs-only";

  runRepo.create({
    id: runId,
    title,
    rawRequirement: input.requirement,
    mode,
    outputLanguage: input.outputLanguage ?? "English",
    projectId: projectCtx.projectId,
    workflowTemplateId: input.workflowTemplateId,
    workflowMode: mode,
  });

  const templateDir = joinPath(dataDir, "prompts");

  let config: {
    agents?: Record<string, string>;
    cli?: Record<string, { enabled: boolean; command: string; timeoutSeconds: number }>;
    agentBackend?: AgentBackendConfig;
  } = {};
  try {
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(joinPath(dataDir, "config.json"), "utf-8");
    config = JSON.parse(raw) as typeof config;
  } catch {
    /* config load is optional */
  }

  const workflowInput = {
    requirement: input.requirement,
    projectRoot: projectCtx.projectRoot,
    memoryContext: undefined,
    templateDir,
    agentMapping: config.agents ?? {},
    cliConfigs: config.cli ?? {},
    agentBackendConfig: config.agentBackend,
    dataDir,
  };

  let result: any;

  try {
    if (input.workflowTemplateId) {
      const wfRepo = storage.createWorkflowTemplateRepository(db);
      const templateRecord = wfRepo.findById(input.workflowTemplateId);
      if (!templateRecord) {
        return {
          runId,
          status: "FAILED",
          artifacts: [],
          createdAt: nowIso(),
          completedAt: nowIso(),
          projectId: projectCtx.projectId,
          workflowTemplateId: input.workflowTemplateId,
          error: `Workflow template "${input.workflowTemplateId}" not found`,
        };
      }
      if (templateRecord.projectId && templateRecord.projectId !== projectCtx.projectId) {
        return {
          runId,
          status: "FAILED",
          artifacts: [],
          createdAt: nowIso(),
          completedAt: nowIso(),
          projectId: projectCtx.projectId,
          workflowTemplateId: input.workflowTemplateId,
          error: "Workflow template does not belong to selected project",
        };
      }

      const template: WorkflowTemplate = {
        workflowTemplateId: templateRecord.id,
        projectId: templateRecord.projectId ?? undefined,
        name: templateRecord.name,
        description: templateRecord.description ?? undefined,
        steps: JSON.parse(templateRecord.steps),
        isDefault: templateRecord.isDefault === 1,
        createdAt: templateRecord.createdAt,
        updatedAt: templateRecord.updatedAt,
      } as any;

      const validationErrors = validateWorkflowTemplateSteps(template);
      if (validationErrors.length > 0) {
        return {
          runId,
          status: "FAILED",
          artifacts: [],
          createdAt: nowIso(),
          completedAt: nowIso(),
          projectId: projectCtx.projectId,
          workflowTemplateId: input.workflowTemplateId,
          error: `Workflow template validation failed: ${validationErrors.join("; ")}`,
        };
      }

      result = await runCustomWorkflow({
        ...workflowInput,
        template,
      } as unknown as Parameters<typeof runCustomWorkflow>[0]);
    } else if (mode === "semi-auto") {
      const selectedAgent = input.agent ?? "claude";
      const { defaultSafetyPolicy } = await import("../policies/safetyPolicy.js");
      result = await runSemiAutoWorkflow({
        ...workflowInput,
        selectedAgent,
        approvalConfig: { requireCodeApproval: !input.approve },
        safetyPolicy: defaultSafetyPolicy(),
        commandTimeoutSeconds: input.timeout ?? 300,
      } as unknown as Parameters<typeof runSemiAutoWorkflow>[0]);
    } else if (mode === "assisted") {
      result = await runAssistedWorkflow(
        workflowInput as unknown as Parameters<typeof runAssistedWorkflow>[0],
      );
    } else {
      result = await runDocsOnlyWorkflow(workflowInput);
    }

    for (let i = 0; i < result.artifacts.length; i++) {
      const artifactPath = result.artifacts[i];
      if (!artifactPath) continue;
      const name = artifactPath.split("/").pop() ?? `artifact-${String(i)}`;
      const format = name.endsWith(".json") ? "json" : "markdown";
      artifactRepo.create({
        id: `${runId}_artifact_${String(i)}`,
        runId,
        type: "RAW_REQUIREMENT",
        name,
        path: artifactPath,
        format,
      });
    }

    runRepo.updateStatus(runId, result.status);

    if (result.pendingGate) {
      approvalRepo.create({
        id: `${runId}_approval_${result.pendingGate.gate.toLowerCase()}`,
        runId,

        gate: result.pendingGate.gate,
        status: "PENDING",
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    runRepo.updateStatus(runId, "FAILED");
    return {
      runId,
      status: "FAILED",
      artifacts: [],
      createdAt: nowIso(),
      completedAt: nowIso(),
      projectId: projectCtx.projectId,
      workflowTemplateId: input.workflowTemplateId,
      error: message,
    };
  }

  try {
    const { addRunMemory } = await import("@codeclaw/memory");
    await addRunMemory(projectCtx.projectRoot, runId, title, input.requirement);
  } catch {
    /* memory add is optional */
  }

  return {
    runId,
    status: result.status,
    artifacts: result.artifacts,
    createdAt: result.createdAt,
    completedAt: result.completedAt,
    projectId: projectCtx.projectId,
    workflowTemplateId: input.workflowTemplateId,
  };
}

function joinPath(...parts: string[]): string {
  // Simple path join that doesn't need the path module at runtime
  return parts.join("/").replace(/\/+/g, "/");
}
