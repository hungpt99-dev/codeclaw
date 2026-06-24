import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { createApp } from "@aiteam/server";
import type { FastifyInstance } from "fastify";

const TEST_DIR = join(".ai-team", "test-server");
const DB_PATH = join(TEST_DIR, "test.sqlite");
const PROMPTS_DIR = join(TEST_DIR, "prompts");

let app: FastifyInstance;

beforeAll(async () => {
  await mkdir(TEST_DIR, { recursive: true });
  await mkdir(PROMPTS_DIR, { recursive: true });
  await writeFile(join(PROMPTS_DIR, "ba-agent.md"), "# BA Agent\n\nYou are a BA agent.", "utf-8");
  await writeFile(
    join(PROMPTS_DIR, "architect-agent.md"),
    "# Architect Agent\n\nYou are an architect.",
    "utf-8",
  );

  app = createApp({ dbPath: DB_PATH, promptsDir: PROMPTS_DIR });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await rm(TEST_DIR, { recursive: true, force: true });
});

function getJson<T>(res: { json: () => T }): T {
  return res.json();
}

async function waitForRunToComplete(runId: string): Promise<void> {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    const res = await app.inject({ method: "GET", url: `/api/runs/${runId}` });
    const body = getJson<{ run: RunItem }>(res);
    if (body.run.status !== "SPEC_GENERATED") {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

interface RunItem {
  id: string;
  title: string;
  mode: string;
  status: string;
}

interface ArtifactItem {
  id: string;
  content?: string;
}

interface PromptItem {
  name: string;
  content?: string;
  updated?: boolean;
}

describe("Local Server API", () => {
  describe("GET /api/health", () => {
    it("returns ok status", async () => {
      const res = await app.inject({ method: "GET", url: "/api/health" });
      expect(res.statusCode).toBe(200);
      expect(getJson(res)).toEqual({ status: "ok" });
    });
  });

  describe("GET /api/settings", () => {
    it("returns settings list", async () => {
      const res = await app.inject({ method: "GET", url: "/api/settings" });
      expect(res.statusCode).toBe(200);
      expect(getJson(res)).toHaveProperty("settings");
    });
  });

  describe("PUT /api/settings", () => {
    it("updates settings", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/settings",
        payload: { projectName: "test-project" },
      });
      expect(res.statusCode).toBe(200);
      const body = getJson<{ settings: { key: string; value: string }[] }>(res);
      expect(body.settings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: "projectName", value: "test-project" }),
        ]),
      );
    });

    it("rejects non-object body", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/settings",
        payload: "invalid",
      });
      expect(res.statusCode).toBe(415);
    });
  });

  describe("POST /api/runs", () => {
    it("creates a run and returns it", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/runs",
        payload: { requirement: "Test requirement for API" },
      });
      expect(res.statusCode).toBe(200);
      const body = getJson<{ run: RunItem }>(res);
      expect(body.run).toBeDefined();
      expect(body.run.title).toBe("Test requirement for API");
      expect(body.run.mode).toBe("docs-only");
      expect(body.run.status).toBe("SPEC_GENERATED");
    });

    it("rejects empty requirement", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/runs",
        payload: { requirement: "" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects missing requirement", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/runs",
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/runs", () => {
    it("lists runs", async () => {
      const res = await app.inject({ method: "GET", url: "/api/runs" });
      expect(res.statusCode).toBe(200);
      const body = getJson<{ runs: RunItem[] }>(res);
      expect(body.runs).toBeInstanceOf(Array);
      expect(body.runs.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/runs/:id", () => {
    it("returns a specific run", async () => {
      const listRes = await app.inject({ method: "GET", url: "/api/runs" });
      const runs = getJson<{ runs: RunItem[] }>(listRes).runs;
      const firstRun = runs[0];
      expect(firstRun).toBeDefined();
      if (!firstRun) return;

      const res = await app.inject({ method: "GET", url: `/api/runs/${firstRun.id}` });
      expect(res.statusCode).toBe(200);
      expect(getJson<{ run: RunItem }>(res).run.id).toBe(firstRun.id);
    });

    it("returns 404 for unknown run", async () => {
      const res = await app.inject({ method: "GET", url: "/api/runs/nonexistent" });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /api/runs/:id/artifacts", () => {
    it("lists artifacts for a run", async () => {
      const listRes = await app.inject({ method: "GET", url: "/api/runs" });
      const runs = getJson<{ runs: RunItem[] }>(listRes).runs;
      const firstRun = runs[0];
      expect(firstRun).toBeDefined();
      if (!firstRun) return;

      await waitForRunToComplete(firstRun.id);

      const res = await app.inject({
        method: "GET",
        url: `/api/runs/${firstRun.id}/artifacts`,
      });
      expect(res.statusCode).toBe(200);
      const body = getJson<{ artifacts: ArtifactItem[] }>(res);
      expect(body.artifacts).toBeInstanceOf(Array);
      expect(body.artifacts.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/runs/:id/artifacts/:artifactId", () => {
    it("returns artifact content", async () => {
      const listRes = await app.inject({ method: "GET", url: "/api/runs" });
      const runs = getJson<{ runs: RunItem[] }>(listRes).runs;
      const firstRun = runs[0];
      expect(firstRun).toBeDefined();
      if (!firstRun) return;

      await waitForRunToComplete(firstRun.id);

      const artRes = await app.inject({
        method: "GET",
        url: `/api/runs/${firstRun.id}/artifacts`,
      });
      const artifacts = getJson<{ artifacts: ArtifactItem[] }>(artRes).artifacts;
      const firstArtifact = artifacts[0];
      expect(firstArtifact).toBeDefined();
      if (!firstArtifact) return;

      const res = await app.inject({
        method: "GET",
        url: `/api/runs/${firstRun.id}/artifacts/${firstArtifact.id}`,
      });
      expect(res.statusCode).toBe(200);
      expect(getJson<{ artifact: ArtifactItem }>(res).artifact).toHaveProperty("content");
    });

    it("returns 404 for unknown artifact", async () => {
      const listRes = await app.inject({ method: "GET", url: "/api/runs" });
      const runs = getJson<{ runs: RunItem[] }>(listRes).runs;
      const firstRun = runs[0];
      expect(firstRun).toBeDefined();
      if (!firstRun) return;

      const res = await app.inject({
        method: "GET",
        url: `/api/runs/${firstRun.id}/artifacts/nonexistent`,
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /api/prompts", () => {
    it("lists prompt templates", async () => {
      const res = await app.inject({ method: "GET", url: "/api/prompts" });
      expect(res.statusCode).toBe(200);
      const body = getJson<{ prompts: PromptItem[] }>(res);
      expect(body.prompts).toBeInstanceOf(Array);
      expect(body.prompts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("GET /api/prompts/:name", () => {
    it("returns prompt content", async () => {
      const res = await app.inject({ method: "GET", url: "/api/prompts/ba-agent.md" });
      expect(res.statusCode).toBe(200);
      expect(getJson<PromptItem>(res).content).toContain("BA Agent");
    });

    it("returns 404 for unknown prompt", async () => {
      const res = await app.inject({ method: "GET", url: "/api/prompts/nonexistent.md" });
      expect(res.statusCode).toBe(404);
    });

    it("blocks path traversal (Fastify normalizes before routing)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/prompts/../../../etc/passwd",
      });
      expect(res.statusCode).toBe(404);
    });

    it("blocks path traversal with encoded dots", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/prompts/..%2F..%2Fetc%2Fpasswd",
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("PUT /api/prompts/:name", () => {
    it("updates prompt content", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/prompts/ba-agent.md",
        payload: { content: "# Updated BA Agent" },
      });
      expect(res.statusCode).toBe(200);
      expect(getJson<PromptItem>(res).updated).toBe(true);
    });

    it("returns 404 for unknown prompt", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/prompts/nonexistent.md",
        payload: { content: "test" },
      });
      expect(res.statusCode).toBe(404);
    });

    it("rejects missing content", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/prompts/ba-agent.md",
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it("blocks path traversal on PUT (Fastify normalizes before routing)", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/prompts/../../../etc/passwd",
        payload: { content: "hacked" },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /api/settings/ai-cli/status", () => {
    it("returns ai cli tools status list", async () => {
      const res = await app.inject({ method: "GET", url: "/api/settings/ai-cli/status" });
      expect(res.statusCode).toBe(200);
      const body = getJson<{ tools: unknown[] }>(res);
      expect(body.tools).toBeInstanceOf(Array);
      expect(body.tools.length).toBeGreaterThan(0);
      const tool = body.tools[0] as { name: string; key: string; status: string };
      expect(tool).toHaveProperty("name");
      expect(tool).toHaveProperty("key");
      expect(tool).toHaveProperty("status");
      expect(["available", "missing", "disabled"]).toContain(tool.status);
    });
  });

  describe("POST /api/settings/ai-cli/test", () => {
    it("rejects missing tool parameter", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/settings/ai-cli/test",
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects unknown tool", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/settings/ai-cli/test",
        payload: { tool: "nonexistent-tool" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("tests a known tool", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/settings/ai-cli/test",
        payload: { tool: "claude" },
      });
      expect(res.statusCode).toBe(200);
      const body = getJson<{ success: boolean; message: string }>(res);
      expect(body).toHaveProperty("success");
      expect(body).toHaveProperty("message");
    });
  });

  describe("GET /api/settings/storage", () => {
    it("returns storage info", async () => {
      const res = await app.inject({ method: "GET", url: "/api/settings/storage" });
      expect(res.statusCode).toBe(200);
      const body = getJson<{
        aiTeamPath: string;
        totalRuns: number;
        totalSizeBytes: number;
      }>(res);
      expect(body).toHaveProperty("aiTeamPath");
      expect(body).toHaveProperty("totalRuns");
      expect(body).toHaveProperty("totalSizeBytes");
      expect(typeof body.totalRuns).toBe("number");
    });
  });

  describe("GET /api/settings/integrations/test/:type", () => {
    it("returns error for unknown integration type", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/settings/integrations/test/unknown",
      });
      expect(res.statusCode).toBe(400);
    });

    it("tests github integration", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/settings/integrations/test/github",
      });
      expect(res.statusCode).toBe(200);
      const body = getJson<{ success: boolean; message: string }>(res);
      expect(body).toHaveProperty("success");
      expect(body).toHaveProperty("message");
    });
  });
});
