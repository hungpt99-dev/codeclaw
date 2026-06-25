/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
import { join } from "node:path";
import { dirname } from "node:path";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import {
  openDatabase,
  initializeSchema,
  createWorkflowTemplateRepository,
  createRunRepository,
  createArtifactRepository,
  createApprovalRepository,
} from "@codeclaw/storage";
import { DEFAULT_WORKFLOW_TEMPLATES, setRunExecutionStorage } from "@codeclaw/core";
import { registerHealthRoutes } from "./routes/health.routes.js";
import { registerSettingsRoutes } from "./routes/settings.routes.js";
import { registerRunsRoutes } from "./routes/runs.routes.js";
import { registerArtifactRoutes } from "./routes/artifacts.routes.js";
import { registerPromptRoutes } from "./routes/prompts.routes.js";
import { registerIntegrationRoutes } from "./routes/integrations.routes.js";
import { registerProgressRoutes } from "./routes/progress.routes.js";
import { registerProjectRoutes } from "./routes/projects.routes.js";
import { registerWorkflowRoutes } from "./routes/workflows.routes.js";
import { registerDoctorRoutes } from "./routes/doctor.routes.js";
import { registerDashboardRoutes } from "./routes/dashboard.routes.js";

interface AppOptions {
  dbPath: string;
  promptsDir: string;
  dataDir?: string;
}

export function createApp(options: AppOptions): FastifyInstance {
  const app = Fastify({ logger: false });

  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  const db = openDatabase(options.dbPath);
  initializeSchema(db);
  const codeclawDir = dirname(options.dbPath);
  const dataDir = options.dataDir ?? codeclawDir;

  // Initialize run execution storage for shared entrypoint
  setRunExecutionStorage({
    openDatabase: (p: string) => openDatabase(p),
    initializeSchema: (d: unknown) => initializeSchema(d as any),
    createRunRepository: (d: unknown) => createRunRepository(d as any) as any,
    createArtifactRepository: (d: unknown) => createArtifactRepository(d as any) as any,
    createApprovalRepository: (d: unknown) => createApprovalRepository(d as any) as any,
    createWorkflowTemplateRepository: (d: unknown) =>
      createWorkflowTemplateRepository(d as any) as any,
  } as any);

  // Seed default workflow templates if none exist
  seedDefaultWorkflowTemplates(db, dataDir);

  registerHealthRoutes(app);
  registerSettingsRoutes(app, db);
  registerRunsRoutes(app, db, codeclawDir, dataDir);
  registerArtifactRoutes(app, db);
  registerPromptRoutes(app, options.promptsDir);
  registerIntegrationRoutes(app, db);
  registerProgressRoutes(app);
  registerProjectRoutes(app);
  registerWorkflowRoutes(app, db);
  registerDoctorRoutes(app, db);
  registerDashboardRoutes(app, db);

  return app;
}

function seedDefaultWorkflowTemplates(
  db: import("@codeclaw/storage").DbConnection,
  _dataDir: string,
): void {
  const repo = createWorkflowTemplateRepository(db);
  const existing = repo.findAll();
  if (existing.length === 0) {
    for (const tpl of DEFAULT_WORKFLOW_TEMPLATES) {
      const id = `default-${tpl.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
      repo.create({
        id,
        projectId: undefined,
        name: tpl.name,
        description: tpl.description,
        steps: JSON.stringify(tpl.steps),
        isDefault: tpl.isDefault ?? false,
        createdAt: undefined,
        updatedAt: undefined,
      });
    }
  }
}

export function getDefaultDbPath(): string {
  return join(".codeclaw", "database.sqlite");
}

export function getDefaultPromptsDir(): string {
  return join(".codeclaw", "prompts");
}
