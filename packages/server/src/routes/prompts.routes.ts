import { readFile, writeFile, access, readdir } from "node:fs/promises";
import { join, resolve, normalize } from "node:path";
import type { FastifyInstance } from "fastify";

export function registerPromptRoutes(app: FastifyInstance, promptsDir: string): void {
  app.get("/api/prompts", async (_request, _reply) => {
    let entries: string[];
    try {
      entries = await readdir(promptsDir);
    } catch {
      return { prompts: [] };
    }
    const prompts = entries
      .filter((e) => e.endsWith(".md"))
      .map((name) => ({
        name,
        path: join(promptsDir, name),
      }));
    return { prompts };
  });

  app.get("/api/prompts/:name", async (request, reply) => {
    const params = request.params as { name: string };
    const promptName = params.name;

    if (!isSafePromptName(promptName)) {
      return reply.status(400).send({ error: "Invalid prompt name" });
    }

    const filePath = resolve(promptsDir, promptName);
    if (!filePath.startsWith(resolve(promptsDir))) {
      return reply.status(403).send({ error: "Path traversal blocked" });
    }

    try {
      await access(filePath);
    } catch {
      return reply.status(404).send({ error: "Prompt not found" });
    }

    const content = await readFile(filePath, "utf-8");
    return { name: promptName, content };
  });

  app.put("/api/prompts/:name", async (request, reply) => {
    const params = request.params as { name: string };
    const promptName = params.name;

    if (!isSafePromptName(promptName)) {
      return reply.status(400).send({ error: "Invalid prompt name" });
    }

    const filePath = resolve(promptsDir, promptName);
    if (!filePath.startsWith(resolve(promptsDir))) {
      return reply.status(403).send({ error: "Path traversal blocked" });
    }

    const body = request.body as { content?: string } | undefined;
    if (!body?.content || typeof body.content !== "string") {
      return reply.status(400).send({ error: "Content is required" });
    }

    try {
      await access(filePath);
    } catch {
      return reply.status(404).send({ error: "Prompt not found" });
    }

    await writeFile(filePath, body.content, "utf-8");
    return { name: promptName, updated: true };
  });
}

function isSafePromptName(name: string): boolean {
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return false;
  }
  const normalized = normalize(name);
  if (normalized !== name) {
    return false;
  }
  return name.endsWith(".md");
}
