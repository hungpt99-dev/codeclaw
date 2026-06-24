import type { FastifyInstance } from "fastify";
import { access } from "node:fs/promises";
import {
  addProject,
  listProjects,
  findProject,
  setActiveProject,
  getActiveProject,
  removeProject,
  isProjectDirectory,
} from "@codeclaw/core";

export function registerProjectRoutes(app: FastifyInstance): void {
  // GET /api/projects - list all registered projects with status
  app.get("/api/projects", async (_request, _reply) => {
    const projects = await listProjects();
    const projectsWithStatus = await Promise.all(
      projects.map(async (p) => {
        let exists = false;
        try {
          await access(p.rootPath);
          exists = true;
        } catch {
          // directory doesn't exist
        }
        return {
          id: p.id,
          name: p.name,
          rootPath: p.rootPath,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          lastUsedAt: p.lastUsedAt,
          exists,
        };
      }),
    );
    const active = await getActiveProject();
    return { projects: projectsWithStatus, activeProjectId: active?.id ?? null };
  });

  // GET /api/projects/current - get active project
  app.get("/api/projects/current", async (_request, _reply) => {
    const active = await getActiveProject();
    if (!active) {
      return { project: null };
    }
    let exists = false;
    try {
      await access(active.rootPath);
      exists = true;
    } catch {
      // directory doesn't exist
    }
    return {
      project: {
        id: active.id,
        name: active.name,
        rootPath: active.rootPath,
        createdAt: active.createdAt,
        updatedAt: active.updatedAt,
        lastUsedAt: active.lastUsedAt,
        exists,
      },
    };
  });

  // POST /api/projects - add a new project
  app.post("/api/projects", async (request, reply) => {
    const body = request.body as { name?: string; rootPath?: string } | undefined;
    if (!body?.rootPath) {
      return reply.status(400).send({ error: "rootPath is required" });
    }
    const name = body.name ?? body.rootPath.split("/").pop() ?? "unnamed";
    try {
      const entry = await addProject(name, body.rootPath);
      return { project: entry };
    } catch (err) {
      return reply.status(409).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/projects/use - set active project
  app.post("/api/projects/use", async (request, reply) => {
    const body = request.body as { nameOrId?: string } | undefined;
    if (!body?.nameOrId) {
      return reply.status(400).send({ error: "nameOrId is required" });
    }
    const project = await setActiveProject(body.nameOrId);
    if (!project) {
      return reply.status(404).send({ error: `Project "${body.nameOrId}" not found` });
    }
    return { project };
  });

  // DELETE /api/projects/:projectId - remove project from registry
  app.delete("/api/projects/:projectId", async (request, reply) => {
    const params = request.params as { projectId: string };
    const removed = await removeProject(params.projectId);
    if (!removed) {
      return reply.status(404).send({ error: "Project not found" });
    }
    return { success: true };
  });

  // GET /api/projects/:projectId/status - check project directory status
  app.get("/api/projects/:projectId/status", async (request, reply) => {
    const params = request.params as { projectId: string };
    const project = await findProject(params.projectId);
    if (!project) {
      return reply.status(404).send({ error: "Project not found" });
    }
    const codeclawExists = await isProjectDirectory(project.rootPath);
    let pathExists = false;
    try {
      await access(project.rootPath);
      pathExists = true;
    } catch {
      // directory doesn't exist
    }
    return {
      projectId: project.id,
      rootPath: project.rootPath,
      pathExists,
      codeclawDirExists: codeclawExists,
    };
  });
}
