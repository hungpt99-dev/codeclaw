import type { FastifyInstance } from "fastify";

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get("/api/health", async (_request, _reply) => {
    return { status: "ok" };
  });
}
