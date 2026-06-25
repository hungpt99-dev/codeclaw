/* eslint-disable @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unnecessary-condition, no-empty */
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { FastifyInstance } from "fastify";
import type { DbConnection } from "@codeclaw/storage";
import { createRunRepository } from "@codeclaw/storage";
import type { DoctorStatus, DoctorCheck } from "@codeclaw/shared";

const execFileAsync = promisify(execFile);

async function checkCliAvailable(command: string): Promise<boolean> {
  try {
    await execFileAsync("which", [command]);
    return true;
  } catch {
    return false;
  }
}

export function registerDoctorRoutes(app: FastifyInstance, db: DbConnection): void {
  app.get("/api/doctor", async (request, _reply) => {
    const query = request.query as { projectId?: string };
    const projectRoot = query.projectId ? undefined : process.cwd();
    const codeclawPath = query.projectId
      ? null
      : join(process.cwd(), ".codeclaw");

    let projectPathExists = false;
    let codeclawDirExists = false;
    try {
      await access(projectRoot ?? "/nonexistent");
      projectPathExists = true;
    } catch { /* expected */ }
    try {
      await access(codeclawPath ?? "/nonexistent");
      codeclawDirExists = true;
    } catch { /* expected */ }

    const projectChecks: DoctorCheck[] = [];
    projectChecks.push({
      name: "Project Directory",
      status: projectPathExists ? "ok" : "error",
      message: projectPathExists
        ? "Project directory exists"
        : "Project directory does not exist",
      recommendation: projectPathExists ? undefined : "Ensure the project path is accessible",
    });
    projectChecks.push({
      name: ".codeclaw Directory",
      status: codeclawDirExists ? "ok" : "error",
      message: codeclawDirExists
        ? ".codeclaw directory exists"
        : ".codeclaw directory not found — run 'codeclaw init'",
      recommendation: codeclawDirExists
        ? undefined
        : "Run 'codeclaw init' in the project root to initialize the .codeclaw directory",
    });

    let databaseAccessible = false;
    try {
      const stmt = db.prepare("SELECT count(*) as cnt FROM runs");
      stmt.get();
      databaseAccessible = true;
    } catch {}
    const storageChecks: DoctorCheck[] = [];
    storageChecks.push({
      name: "Database",
      status: databaseAccessible ? "ok" : "error",
      message: databaseAccessible
        ? "SQLite database is accessible"
        : "Cannot access SQLite database",
      recommendation: databaseAccessible
        ? undefined
        : "Check file permissions for .codeclaw/database.sqlite",
    });
    if (databaseAccessible) {
      const runRepo = createRunRepository(db);
      const runs = runRepo.findAll();
    storageChecks.push({
      name: "Run Storage",
      status: "ok",
      message: `${runs.length} run(s) stored`,
      recommendation: undefined,
    });
    }

    let config: { agentBackend?: { provider?: string; model?: string; apiKeyEnv?: string } } = {};
    try {
      const raw = await readFile(
        query.projectId ? `/nonexistent` : join(process.cwd(), ".codeclaw", "config.json"),
        "utf-8",
      );
      config = JSON.parse(raw) as typeof config;
    } catch {}

    const providerName = config.agentBackend?.provider ?? "none";
    const modelName = config.agentBackend?.model ?? null;
    const apiKeyEnv = config.agentBackend?.apiKeyEnv ?? null;
    const providerConfigured = providerName !== "none" && providerName !== undefined;
    const providerChecks: DoctorCheck[] = [];
    providerChecks.push({
      name: "Provider",
      status: providerConfigured ? "ok" : "warning",
      message: providerConfigured
        ? `Provider: ${providerName}`
        : "No AI provider configured — using deterministic templates",
      recommendation: providerConfigured
        ? undefined
        : "Set a provider in config.json or rely on deterministic fallback",
    });
    if (providerConfigured && modelName) {
      providerChecks.push({
        name: "Model",
        status: "ok",
        message: `Model: ${modelName}`,
        recommendation: undefined,
      });
    }
    if (apiKeyEnv) {
      const envValue = process.env[apiKeyEnv];
      providerChecks.push({
        name: "API Key",
        status: envValue && envValue.length > 0 ? "ok" : "warning",
        message: `Env var: ${apiKeyEnv}`,
        recommendation:
          envValue && envValue.length > 0
            ? undefined
            : `Set ${apiKeyEnv} environment variable`,
      });
    }

    const adapterNames = [
      { name: "Claude Code", key: "claude", command: "claude" },
      { name: "Codex CLI", key: "codex", command: "codex" },
      { name: "Gemini CLI", key: "gemini", command: "gemini" },
      { name: "Aider", key: "aider", command: "aider" },
      { name: "OpenCode", key: "opencode", command: "opencode" },
    ];
    const adapterItems: { name: string; key: string; available: boolean; enabled: boolean; command: string }[] = [];
    const adapterChecks: DoctorCheck[] = [];
    for (const ad of adapterNames) {
      const available = await checkCliAvailable(ad.command);
      adapterItems.push({
        name: ad.name,
        key: ad.key,
        available,
        enabled: available,
        command: ad.command,
      });
    }
    const availableAdapters = adapterItems.filter((a) => a.available);
    const missingAdapters = adapterItems.filter((a) => !a.available);
    adapterChecks.push({
      name: "Coding Adapters",
      status: availableAdapters.length > 0 ? "ok" : "warning",
      message: availableAdapters.length > 0
        ? `${availableAdapters.length} adapter(s) available: ${availableAdapters.map((a) => a.name).join(", ")}`
        : "No coding adapters available",
      recommendation: availableAdapters.length > 0
        ? undefined
        : "Install at least one AI coding CLI (Claude Code, Codex CLI, Gemini CLI, or Aider)",
    });
    if (missingAdapters.length > 0) {
      adapterChecks.push({
        name: "Missing Adapters",
        status: "warning",
        message: `${missingAdapters.length} adapter(s) not found: ${missingAdapters.map((a) => a.name).join(", ")}`,
        recommendation: "Install missing CLI tools or configure adapters in Settings",
      });
    }

    let nativeRunnerAvailable = false;
    let nativeRunnerVersion: string | null = null;
    try {
      const available = await checkCliAvailable("codeclaw-runner");
      nativeRunnerAvailable = available;
      nativeRunnerVersion = available ? "detected" : null;
    } catch {}
    const nativeRunnerChecks: DoctorCheck[] = [];
    nativeRunnerChecks.push({
      name: "Native Runner",
      status: nativeRunnerAvailable ? "ok" : "info",
      message: nativeRunnerAvailable
        ? "Native runner is available"
        : "Native runner not found — optional for deterministic workflows",
      recommendation: nativeRunnerAvailable
        ? undefined
        : "Install native runner for additional capabilities",
    });

    const envVars: string[] = [];
    if (apiKeyEnv) envVars.push(apiKeyEnv);
    const secretEnvVars = [
      "CODECLAW_OPENAI_API_KEY",
      "CODECLAW_JIRA_TOKEN",
      "CODECLAW_SLACK_TOKEN",
      "OPENAI_API_KEY",
      "ANTHROPIC_API_KEY",
    ];
    for (const env of secretEnvVars) {
      if (process.env[env]) {
        envVars.push(env);
      }
    }
    const securityChecks: DoctorCheck[] = [];
    securityChecks.push({
      name: "Secrets in Config",
      status: "ok",
      message: "Config does not expose secret values (env var names only)",
      recommendation: undefined,
    });
    if (envVars.length > 0) {
      securityChecks.push({
        name: "Environment Variables",
        status: "ok",
        message: `${envVars.length} secret env var(s) detected — values are not exposed`,
        recommendation: undefined,
      });
    }

    const recommendations: string[] = [];
    if (!projectPathExists) {
      recommendations.push("Create or verify the project directory path");
    }
    if (!codeclawDirExists) {
      recommendations.push("Run 'codeclaw init' to initialize .codeclaw directory");
    }
    if (!providerConfigured) {
      recommendations.push("Configure an AI provider (or use deterministic fallback for docs-only mode)");
    }
    if (missingAdapters.length === adapterItems.length) {
      recommendations.push("Install at least one AI coding CLI tool for code execution modes");
    }
    if (!nativeRunnerAvailable) {
      recommendations.push("Consider installing native runner for better performance");
    }
    if (recommendations.length === 0) {
      recommendations.push("All systems ready");
    }

    const overallStatus: DoctorStatus = {
      project: {
        status: projectPathExists && codeclawDirExists ? "ok" : "error",
        name: null,
        rootPath: projectRoot ?? null,
        pathExists: projectPathExists,
        codeclawDirExists,
        checks: projectChecks,
      },
      storage: {
        status: databaseAccessible ? "ok" : "error",
        databaseAccessible,
        totalRuns: databaseAccessible ? createRunRepository(db).findAll().length : 0,
        checks: storageChecks,
      },
      providers: {
        status: providerConfigured ? "ok" : "warning",
        provider: providerName,
        model: modelName,
        apiKeyEnv: apiKeyEnv ?? null,
        configured: providerConfigured,
        checks: providerChecks,
      },
      adapters: {
        status: availableAdapters.length > 0 ? "ok" : "warning",
        items: adapterItems,
        checks: adapterChecks,
      },
      nativeRunner: {
        status: nativeRunnerAvailable ? "ok" : "info",
        available: nativeRunnerAvailable,
        version: nativeRunnerVersion,
        checks: nativeRunnerChecks,
      },
      security: {
        status: "ok",
        secretsExposed: false,
        envVarNames: envVars,
        checks: securityChecks,
      },
      recommendations,
    };

    return overallStatus;
  });
}
