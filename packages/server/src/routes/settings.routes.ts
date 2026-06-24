import { execFile } from "node:child_process";
import { readdir, stat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { FastifyInstance } from "fastify";
import type { DbConnection } from "@codeclaw/storage";
import { createSettingRepository, createRunRepository } from "@codeclaw/storage";
import { configSchema } from "@codeclaw/shared";
import type { AiCliToolConfig } from "@codeclaw/shared";

const execFileAsync = promisify(execFile);

async function checkCliAvailable(command: string): Promise<boolean> {
  try {
    await execFileAsync("which", [command]);
    return true;
  } catch {
    return false;
  }
}

const AI_CLI_TOOLS = [
  { name: "Claude Code", key: "claude", command: "claude" },
  { name: "Codex CLI", key: "codex", command: "codex" },
  { name: "Gemini CLI", key: "gemini", command: "gemini" },
  { name: "Aider", key: "aider", command: "aider" },
];

async function getDirSize(dirPath: string): Promise<number> {
  let totalSize = 0;
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isFile()) {
        const fileStat = await stat(fullPath);
        totalSize += fileStat.size;
      } else if (entry.isDirectory()) {
        totalSize += await getDirSize(fullPath);
      }
    }
  } catch {
    // directory doesn't exist or can't be accessed
  }
  return totalSize;
}

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

  app.get("/api/settings/ai-cli/status", async (_request, _reply) => {
    let configTools: Record<string, { enabled: boolean; command: string }> = {};
    try {
      const configPath = join(process.cwd(), ".codeclaw", "config.json");
      const raw = await readFile(configPath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      const cfg = configSchema.parse(parsed);
      configTools = {
        claude: { enabled: cfg.cli.claude.enabled, command: cfg.cli.claude.command },
        codex: { enabled: cfg.cli.codex.enabled, command: cfg.cli.codex.command },
        gemini: { enabled: cfg.cli.gemini.enabled, command: cfg.cli.gemini.command },
        aider: { enabled: cfg.cli.aider.enabled, command: cfg.cli.aider.command },
      };
    } catch {
      configTools = {
        claude: { enabled: false, command: "claude" },
        codex: { enabled: false, command: "codex" },
        gemini: { enabled: false, command: "gemini" },
        aider: { enabled: false, command: "aider" },
      };
    }

    const tools = await Promise.all(
      AI_CLI_TOOLS.map(async (tool) => {
        const config = configTools[tool.key] ?? { enabled: false, command: tool.command };
        const available = await checkCliAvailable(config.command);
        return {
          name: tool.name,
          key: tool.key,
          command: config.command,
          enabled: config.enabled,
          available,
          status: !config.enabled ? "disabled" : available ? "available" : "missing",
        } as const;
      }),
    );

    return { tools };
  });

  app.post("/api/settings/ai-cli/test", async (request, reply) => {
    const body = request.body as { tool?: string } | undefined;
    if (!body?.tool) {
      return reply.status(400).send({ success: false, message: "Tool name is required" });
    }

    const toolConfig = AI_CLI_TOOLS.find((t) => t.key === body.tool || t.name === body.tool);
    if (!toolConfig) {
      return reply.status(400).send({ success: false, message: `Unknown tool: ${body.tool}` });
    }

    let commandToTest = toolConfig.command;
    try {
      const configPath = join(process.cwd(), ".codeclaw", "config.json");
      const raw = await readFile(configPath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      const cfg = configSchema.parse(parsed);
      const cliCfg = (cfg.cli as Record<string, AiCliToolConfig | undefined>)[toolConfig.key];
      if (cliCfg) {
        commandToTest = cliCfg.command;
      }
    } catch {
      // use default command if config not available
    }

    const available = await checkCliAvailable(commandToTest);
    if (available) {
      return { success: true, message: `${toolConfig.name} is available at \`${commandToTest}\`` };
    }
    return {
      success: false,
      message: `${toolConfig.name} not found at \`${commandToTest}\`. Ensure it is installed and in PATH.`,
    };
  });

  app.get("/api/settings/storage", async (_request, _reply) => {
    const cwd = process.cwd();
    const aiTeamPath = join(cwd, ".codeclaw");
    const databasePath = join(aiTeamPath, "database.sqlite");
    const runsPath = join(aiTeamPath, "runs");
    const promptsPath = join(aiTeamPath, "prompts");
    const logsPath = join(aiTeamPath, "logs");

    const runRepo = createRunRepository(db);
    const runs = runRepo.findAll();

    const totalSizeBytes = await getDirSize(aiTeamPath);

    return {
      aiTeamPath,
      databasePath,
      runsPath,
      promptsPath,
      logsPath,
      totalRuns: runs.length,
      totalSizeBytes,
    };
  });

  app.post("/api/settings/storage/clean", async (request, _reply) => {
    const body = request.body as { days?: number } | undefined;
    const olderThanDays = body?.days ?? 30;

    const runRepo = createRunRepository(db);
    const runs = runRepo.findAll();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    let freedBytes = 0;
    for (const run of runs) {
      const runDate = new Date(run.createdAt);
      if (runDate < cutoff) {
        const runDir = join(process.cwd(), ".codeclaw", "runs", run.id);
        const size = await getDirSize(runDir);
        freedBytes += size;
        try {
          const { rm } = await import("node:fs/promises");
          await rm(runDir, { recursive: true, force: true });
        } catch {
          // ignore if not found
        }
      }
    }

    return {
      success: true,
      message: `Cleaned runs older than ${String(olderThanDays)} days`,
      freedBytes,
    };
  });

  app.get("/api/settings/integrations/test/:type", async (request, reply) => {
    const params = request.params as { type: string };
    const { type } = params;

    switch (type) {
      case "github": {
        const { checkStatus } = await import("@codeclaw/adapters");
        const config = { enabled: true, mode: "gh-cli" as const };
        const status = await checkStatus(config);
        return { success: status.ghCliAvailable, message: status.overall };
      }
      case "jira": {
        try {
          const configPath = join(process.cwd(), ".codeclaw", "config.json");
          const raw = await readFile(configPath, "utf-8");
          const parsed: unknown = JSON.parse(raw);
          const cfg = configSchema.parse(parsed);
          const { testJiraConnection } = await import("@codeclaw/adapters");
          const result = await testJiraConnection(cfg.integrations.jira);
          return result;
        } catch {
          return reply.status(400).send({ success: false, message: "Jira not configured" });
        }
      }
      case "slack": {
        try {
          const configPath = join(process.cwd(), ".codeclaw", "config.json");
          const raw = await readFile(configPath, "utf-8");
          const parsed: unknown = JSON.parse(raw);
          const cfg = configSchema.parse(parsed);
          const { testSlackConnection } = await import("@codeclaw/adapters");
          const result = await testSlackConnection(cfg.integrations.slack);
          return result;
        } catch {
          return reply.status(400).send({ success: false, message: "Slack not configured" });
        }
      }
      default:
        return reply.status(400).send({ success: false, message: `Unknown integration: ${type}` });
    }
  });

  app.get("/api/settings/providers", async (_request, _reply) => {
    try {
      const configPath = join(process.cwd(), ".codeclaw", "config.json");
      const raw = await readFile(configPath, "utf-8");
      const config = JSON.parse(raw) as Record<string, unknown>;
      const agentBackend = config.agentBackend as Record<string, unknown> | undefined;
      return {
        provider: agentBackend?.provider ?? "none",
        model: agentBackend?.model ?? null,
        baseUrl: agentBackend?.baseUrl ?? null,
        apiKeyEnv: agentBackend?.apiKeyEnv ?? null,
        timeoutMs: agentBackend?.timeoutMs ?? null,
      };
    } catch {
      return { provider: "none", model: null, baseUrl: null, apiKeyEnv: null, timeoutMs: null };
    }
  });

  app.get("/api/settings/native-runner", async (_request, _reply) => {
    try {
      const available = await checkCliAvailable("codeclaw-runner");
      return { available, version: available ? "detected" : null };
    } catch {
      return { available: false, version: null };
    }
  });
}
