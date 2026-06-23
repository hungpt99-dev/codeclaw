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

    if (body.max_iterations !== undefined) {
      const n = Number(body.max_iterations);
      if (!Number.isInteger(n) || n < 1) {
        return reply.status(400).send({ error: "Max iterations must be a positive integer" });
      }
    }

    if (body.command_timeout !== undefined) {
      const n = Number(body.command_timeout);
      if (!Number.isInteger(n) || n < 1) {
        return reply.status(400).send({ error: "Command timeout must be a positive integer" });
      }
    }

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string" || typeof value === "number") {
        repo.set(key, String(value));
      }
    }
    const settings = repo.getAll();
    return { settings };
  });
}
