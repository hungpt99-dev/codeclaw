import type { FastifyInstance } from "fastify";
import type { DbConnection } from "@aiteam/storage";
import { createSettingRepository } from "@aiteam/storage";

export function registerSettingsRoutes(app: FastifyInstance, db: DbConnection): void {
  app.get("/api/settings", async (_request, _reply) => {
    const repo = createSettingRepository(db);
    const settings = repo.getAll();
    return { settings };
  });

  app.put("/api/settings", async (request, reply) => {
    const repo = createSettingRepository(db);
    const body = request.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== "object") {
      return reply.status(400).send({ error: "Invalid request body" });
    }
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        repo.set(key, value);
      }
    }
    const settings = repo.getAll();
    return { settings };
  });
}
