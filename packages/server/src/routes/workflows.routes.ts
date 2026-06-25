import type { FastifyInstance } from "fastify";
import type { DbConnection } from "@codeclaw/storage";
import { createWorkflowTemplateRepository } from "@codeclaw/storage";

export function registerWorkflowRoutes(app: FastifyInstance, db: DbConnection): void {
  const repo = createWorkflowTemplateRepository(db);

  app.get("/api/workflows", async (request, _reply) => {
    const query = request.query as { projectId?: string };
    if (query.projectId) {
      const templates = repo.findAll(query.projectId);
      return { templates: templates.map(deserializeSteps) };
    }
    const templates = repo.findAll();
    return { templates: templates.map(deserializeSteps) };
  });

  app.post("/api/workflows", async (request, reply) => {
    const body = request.body as
      | {
          projectId?: string;
          name: string;
          description?: string;
          steps: {
            id: string;
            name: string;
            agentName?: string;
            enabled: boolean;
            requiresApproval?: boolean;
            producesArtifacts?: boolean;
            description?: string;
            order: number;
          }[];
          isDefault?: boolean;
        }
      | undefined;

    if (!body?.name || !body?.steps) {
      return reply.status(400).send({ error: "name and steps are required" });
    }

    const id = `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record = repo.create({
      id,
      projectId: body.projectId ?? undefined,
      name: body.name,
      description: body.description ?? undefined,
      steps: JSON.stringify(body.steps),
      isDefault: body.isDefault ?? false,
      createdAt: undefined,
      updatedAt: undefined,
    });

    return { template: deserializeSteps(record) };
  });

  app.get("/api/workflows/:id", async (request, _reply) => {
    const params = request.params as { id: string };
    const query = request.query as { projectId?: string };
    const record = repo.findById(params.id);
    if (!record) {
      return reply.status(404).send({ error: "Workflow template not found" });
    }
    if (query.projectId && record.projectId && record.projectId !== query.projectId) {
      return reply.status(404).send({ error: "Workflow template not found in this project" });
    }
    return { template: deserializeSteps(record) };
  });

  app.put("/api/workflows/:id", async (request, _reply) => {
    const params = request.params as { id: string };
    const body = request.body as
      | {
          name?: string;
          description?: string;
          steps?: {
            id: string;
            name: string;
            agentName?: string;
            enabled: boolean;
            requiresApproval?: boolean;
            producesArtifacts?: boolean;
            description?: string;
            order: number;
          }[];
          isDefault?: boolean;
        }
      | undefined;

    const existing = repo.findById(params.id);
    if (!existing) {
      return reply.status(404).send({ error: "Workflow template not found" });
    }

    const updated = repo.update(params.id, {
      name: body?.name,
      description: body?.description,
      steps: body?.steps ? JSON.stringify(body.steps) : undefined,
      isDefault: body?.isDefault,
    });

    if (!updated) {
      return reply.status(500).send({ error: "Failed to update workflow template" });
    }
    return { template: deserializeSteps(updated) };
  });

  app.delete("/api/workflows/:id", async (request, _reply) => {
    const params = request.params as { id: string };
    const removed = repo.remove(params.id);
    if (!removed) {
      return reply.status(404).send({ error: "Workflow template not found" });
    }
    return { success: true };
  });

  app.post("/api/workflows/:id/duplicate", async (request, _reply) => {
    const params = request.params as { id: string };
    const existing = repo.findById(params.id);
    if (!existing) {
      return reply.status(404).send({ error: "Workflow template not found" });
    }

    const newId = `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record = repo.create({
      id: newId,
      projectId: existing.projectId ?? undefined,
      name: `${existing.name} (copy)`,
      description: existing.description ?? undefined,
      steps: existing.steps,
      isDefault: false,
      createdAt: undefined,
      updatedAt: undefined,
    });

    return { template: deserializeSteps(record) };
  });

  app.post("/api/workflows/:id/validate", async (request, _reply) => {
    const params = request.params as { id: string };
    const record = repo.findById(params.id);
    if (!record) {
      return reply.status(404).send({ error: "Workflow template not found" });
    }

    const steps = JSON.parse(record.steps) as { id: string; name: string; enabled: boolean }[];
    const warnings: string[] = [];
    const errors: string[] = [];

    if (steps.length === 0) {
      errors.push("Workflow has no steps");
    }

    const enabledSteps = steps.filter((s) => s.enabled);
    if (enabledSteps.length === 0) {
      errors.push("No steps are enabled");
    }

    const ids = steps.map((s) => s.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length > 0) {
      errors.push(`Duplicate step IDs: ${duplicates.join(", ")}`);
    }

    if (steps.some((s) => !s.name.trim())) {
      errors.push("All steps must have a name");
    }

    return { valid: errors.length === 0, errors, warnings };
  });
}

function deserializeSteps(record: {
  id: string;
  projectId: string | null;
  name: string;
  description: string | null;
  steps: string;
  isDefault: number;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    workflowTemplateId: record.id,
    projectId: record.projectId ?? undefined,
    name: record.name,
    description: record.description ?? undefined,
    steps: JSON.parse(record.steps) as {
      id: string;
      name: string;
      agentName?: string;
      enabled: boolean;
      requiresApproval?: boolean;
      producesArtifacts?: boolean;
      description?: string;
      order: number;
    }[],
    isDefault: record.isDefault === 1,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
