import { join } from "node:path";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { openDatabase, initializeSchema } from "@codeclaw/storage";
import { registerHealthRoutes } from "./routes/health.routes.js";
import { registerSettingsRoutes } from "./routes/settings.routes.js";
import { registerRunsRoutes } from "./routes/runs.routes.js";
import { registerArtifactRoutes } from "./routes/artifacts.routes.js";
import { registerPromptRoutes } from "./routes/prompts.routes.js";
import { registerIntegrationRoutes } from "./routes/integrations.routes.js";
import { registerProgressRoutes } from "./routes/progress.routes.js";

interface AppOptions {
  dbPath: string;
  promptsDir: string;
}

export function createApp(options: AppOptions): FastifyInstance {
  const app = Fastify({ logger: false });

  // Allow empty JSON body (web UI sends POST with empty body)
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  const db = openDatabase(options.dbPath);
  initializeSchema(db);

  registerHealthRoutes(app);
  registerSettingsRoutes(app, db);
  registerRunsRoutes(app, db);
  registerArtifactRoutes(app, db);
  registerPromptRoutes(app, options.promptsDir);
  registerIntegrationRoutes(app, db);
  registerProgressRoutes(app);

  return app;
}

export function getDefaultDbPath(): string {
  return join(".codeclaw", "database.sqlite");
}

export function getDefaultPromptsDir(): string {
  return join(".codeclaw", "prompts");
}
