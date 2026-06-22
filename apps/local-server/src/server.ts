import { join } from "node:path";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { openDatabase, initializeSchema } from "@aiteam/storage";
import { registerHealthRoutes } from "./routes/health.routes.js";
import { registerSettingsRoutes } from "./routes/settings.routes.js";
import { registerRunsRoutes } from "./routes/runs.routes.js";
import { registerArtifactRoutes } from "./routes/artifacts.routes.js";
import { registerPromptRoutes } from "./routes/prompts.routes.js";

export interface AppOptions {
  dbPath: string;
  promptsDir: string;
}

export function createApp(options: AppOptions): FastifyInstance {
  const app = Fastify({ logger: false });
  const db = openDatabase(options.dbPath);
  initializeSchema(db);

  registerHealthRoutes(app);
  registerSettingsRoutes(app, db);
  registerRunsRoutes(app, db);
  registerArtifactRoutes(app, db);
  registerPromptRoutes(app, options.promptsDir);

  return app;
}

export function getDefaultDbPath(): string {
  return join(".ai-team", "database.sqlite");
}

export function getDefaultPromptsDir(): string {
  return join(".ai-team", "prompts");
}
