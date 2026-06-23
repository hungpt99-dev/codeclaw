import { readFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import type { DbConnection } from "@aiteam/storage";
import { createArtifactRepository } from "@aiteam/storage";

export function registerArtifactRoutes(app: FastifyInstance, db: DbConnection): void {
  app.get("/api/runs/:id/artifacts", async (request, _reply) => {
    const params = request.params as { id: string };
    const repo = createArtifactRepository(db);
    const artifacts = repo.findByRunId(params.id);
    return { artifacts };
  });

  app.get("/api/runs/:id/artifacts/:artifactId", async (request, reply) => {
    const params = request.params as { id: string; artifactId: string };
    const repo = createArtifactRepository(db);
    const artifact = repo.findById(params.artifactId);
    if (!artifact) {
      return reply.status(404).send({ error: "Artifact not found" });
    }
    if (artifact.runId !== params.id) {
      return reply.status(404).send({ error: "Artifact not found for this run" });
    }
    try {
      const content = await readFile(artifact.path, "utf-8");
      return { artifact: { ...artifact, content } };
    } catch {
      return reply.status(500).send({ error: "Failed to read artifact file" });
    }
  });
}
