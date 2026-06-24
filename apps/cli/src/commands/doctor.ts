import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { configSchema } from "@codeclaw/shared";
import { openDatabase } from "@codeclaw/storage";
import { getMemoryStatus } from "@codeclaw/memory";
import { analyzeRepository } from "@codeclaw/core";
import {
  createClaudeCodeAdapter,
  createCodexAdapter,
  createGeminiAdapter,
  createAiderAdapter,
  isGhCliAvailable,
  isGhAuthenticated,
  getJiraStatus,
  getSlackStatus,
} from "@codeclaw/adapters";

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function doctorCommand(): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".codeclaw");
  const results: CheckResult[] = [];

  const aiTeamExists = await fileExists(aiTeamDir);
  results.push({
    name: ".codeclaw directory",
    status: aiTeamExists ? "pass" : "fail",
    message: aiTeamExists ? "Exists" : "Not found. Run 'codeclaw init' first.",
  });

  if (!aiTeamExists) {
    printResults(results);
    process.exit(1);
  }

  const configPath = join(aiTeamDir, "config.json");
  const configExists = await fileExists(configPath);
  if (configExists) {
    try {
      const raw = await readFile(configPath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      configSchema.parse(parsed);
      results.push({
        name: "config.json",
        status: "pass",
        message: "Valid",
      });
    } catch (e) {
      results.push({
        name: "config.json",
        status: "fail",
        message: `Invalid: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  } else {
    results.push({
      name: "config.json",
      status: "fail",
      message: "Not found",
    });
  }

  const dbPath = join(aiTeamDir, "database.sqlite");
  const dbExists = await fileExists(dbPath);
  if (dbExists) {
    try {
      const db = openDatabase(dbPath);
      db.prepare("SELECT 1").get();
      db.close();
      results.push({
        name: "SQLite database",
        status: "pass",
        message: "Opens successfully",
      });
    } catch (e) {
      results.push({
        name: "SQLite database",
        status: "fail",
        message: `Cannot open: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  } else {
    results.push({
      name: "SQLite database",
      status: "fail",
      message: "Not found",
    });
  }

  const promptsDir = join(aiTeamDir, "prompts");
  const promptsExist = await fileExists(promptsDir);
  if (promptsExist) {
    const requiredTemplates = [
      "ba-agent.md",
      "architect-agent.md",
      "pm-agent.md",
      "qa-agent.md",
      "reporter-agent.md",
    ];
    const missing: string[] = [];
    for (const tpl of requiredTemplates) {
      if (!(await fileExists(join(promptsDir, tpl)))) {
        missing.push(tpl);
      }
    }
    results.push({
      name: "Prompt templates",
      status: missing.length === 0 ? "pass" : "warn",
      message: missing.length === 0 ? "All templates present" : `Missing: ${missing.join(", ")}`,
    });
  } else {
    results.push({
      name: "Prompt templates",
      status: "fail",
      message: "Directory not found",
    });
  }

  try {
    execSync("node --version", { stdio: "pipe" });
    results.push({
      name: "Node.js",
      status: "pass",
      message: "Available",
    });
  } catch {
    results.push({
      name: "Node.js",
      status: "fail",
      message: "Not available",
    });
  }

  try {
    execSync("git --version", { stdio: "pipe" });
    results.push({
      name: "Git",
      status: "pass",
      message: "Available",
    });
  } catch {
    results.push({
      name: "Git",
      status: "fail",
      message: "Not available",
    });
  }

  const claudeAdapter = createClaudeCodeAdapter();
  const claudeAvailable = await claudeAdapter.isAvailable();
  results.push({
    name: "Claude Code CLI",
    status: claudeAvailable ? "pass" : "warn",
    message: claudeAvailable ? "Available" : "Not found in PATH",
  });

  const codexAdapter = createCodexAdapter();
  const codexAvailable = await codexAdapter.isAvailable();
  results.push({
    name: "Codex CLI",
    status: codexAvailable ? "pass" : "warn",
    message: codexAvailable ? "Available" : "Not found in PATH",
  });

  const geminiAdapter = createGeminiAdapter();
  const geminiAvailable = await geminiAdapter.isAvailable();
  results.push({
    name: "Gemini CLI",
    status: geminiAvailable ? "pass" : "warn",
    message: geminiAvailable ? "Available" : "Not found in PATH",
  });

  const aiderAdapter = createAiderAdapter();
  const aiderAvailable = await aiderAdapter.isAvailable();
  results.push({
    name: "Aider CLI",
    status: aiderAvailable ? "pass" : "warn",
    message: aiderAvailable ? "Available" : "Not found in PATH",
  });

  const ghAvailable = await isGhCliAvailable();
  const ghAuthenticated = await isGhAuthenticated();
  results.push({
    name: "GitHub CLI (gh)",
    status: ghAvailable ? (ghAuthenticated ? "pass" : "warn") : "warn",
    message: ghAvailable
      ? ghAuthenticated
        ? "Available and authenticated"
        : "Available but not authenticated. Run: gh auth login"
      : "Not found in PATH",
  });

  if (configExists) {
    try {
      const raw = await readFile(configPath, "utf-8");
      const parsed: Record<string, unknown> = JSON.parse(raw) as Record<string, unknown>;
      const agents = parsed.agents as Record<string, string> | undefined;
      const cli = parsed.cli as Record<string, { enabled: boolean }> | undefined;
      if (agents) {
        const mapping = Object.entries(agents)
          .map(([key, val]) => `${key.replace("default", "")} → ${val}`)
          .join(", ");
        results.push({
          name: "Agent-to-tool mapping",
          status: "pass",
          message: mapping || "No mapping configured",
        });

        const devAgent = agents.defaultDeveloper;
        if (devAgent && cli) {
          const devCliConfig = cli[devAgent];
          if (devCliConfig && !devCliConfig.enabled) {
            results.push({
              name: `Default developer agent (${devAgent})`,
              status: "warn",
              message: `Agent ${devAgent} is configured but disabled in CLI settings`,
            });
          } else if (devCliConfig?.enabled) {
            results.push({
              name: `Default developer agent (${devAgent})`,
              status: "pass",
              message: "Enabled and configured",
            });
          }
        }
      }
      if (cli) {
        const enabledTools = Object.entries(cli)
          .filter(([, cfg]) => cfg.enabled)
          .map(([name]) => name);
        results.push({
          name: "Enabled AI CLI tools",
          status: enabledTools.length > 0 ? "pass" : "warn",
          message: enabledTools.length > 0 ? enabledTools.join(", ") : "None enabled",
        });
      }

      const integrations = parsed.integrations as
        | {
            github?: { enabled?: boolean; owner?: string; repo?: string };
            jira?: Record<string, unknown>;
            slack?: { enabled?: boolean; channelId?: string; tokenEnvRef?: string };
          }
        | undefined;
      if (integrations?.github?.enabled) {
        results.push({
          name: "GitHub integration",
          status: ghAvailable ? (ghAuthenticated ? "pass" : "warn") : "warn",
          message: ghAvailable
            ? ghAuthenticated
              ? `Enabled (${integrations.github.owner ?? "?"}/${integrations.github.repo ?? "?"})`
              : "Enabled but not authenticated"
            : "Enabled but gh CLI not found",
        });
      }

      const slackCfg = integrations?.slack as
        | {
            enabled?: boolean;
            channelId?: string;
            tokenEnvRef?: string;
          }
        | undefined;
      if (slackCfg?.enabled) {
        const status = getSlackStatus({
          enabled: true,
          channelId: slackCfg.channelId,
          tokenEnvRef: slackCfg.tokenEnvRef ?? "CODECLAW_SLACK_TOKEN",
          notifyOn: ["report_ready"],
        });
        results.push({
          name: "Slack integration",
          status:
            status.overall === "ok" ? "pass" : status.overall === "missing_token" ? "warn" : "fail",
          message:
            status.overall === "ok"
              ? `Enabled (channel: ${status.channelId ?? "?"})`
              : status.overall === "missing_token"
                ? "Enabled but token missing"
                : `Enabled but incomplete config (${status.overall})`,
        });
      }

      const jiraCfg = integrations?.jira as
        | {
            enabled?: boolean;
            siteUrl?: string;
            email?: string;
            projectKey?: string;
            tokenEnvRef?: string;
          }
        | undefined;
      if (jiraCfg?.enabled) {
        const status = getJiraStatus({
          enabled: true,
          siteUrl: jiraCfg.siteUrl,
          email: jiraCfg.email,
          projectKey: jiraCfg.projectKey,
          defaultIssueType: "task",
          tokenEnvRef: jiraCfg.tokenEnvRef ?? "CODECLAW_JIRA_TOKEN",
        });
        results.push({
          name: "Jira integration",
          status:
            status.overall === "ok" ? "pass" : status.overall === "missing_token" ? "warn" : "fail",
          message:
            status.overall === "ok"
              ? `Enabled (${status.siteUrl ?? "?"})`
              : status.overall === "missing_token"
                ? "Enabled but token missing"
                : `Enabled but incomplete config (${status.overall})`,
        });
      }
    } catch {
      // config already validated above
    }
  }

  const analysis = await analyzeRepository(process.cwd());
  if (analysis.projectType !== "generic") {
    if (analysis.buildTool) {
      try {
        execSync(`which ${analysis.buildTool}`, { stdio: "pipe" });
        results.push({
          name: `${analysis.buildTool} (${analysis.framework ?? "build tool"})`,
          status: "pass",
          message: "Available",
        });
      } catch {
        results.push({
          name: `${analysis.buildTool} (${analysis.framework ?? "build tool"})`,
          status: "warn",
          message: "Not found in PATH",
        });
      }
    }
  }

  const memoryStatus = await getMemoryStatus(process.cwd());
  if (memoryStatus.exists) {
    results.push({
      name: "Runtime memory directory",
      status: "pass",
      message: "Exists",
    });
    results.push({
      name: "Project memory files",
      status: memoryStatus.projectMemoryCount > 0 ? "pass" : "warn",
      message: `${String(memoryStatus.projectMemoryCount)} files`,
    });
    results.push({
      name: "Decision memory files",
      status: memoryStatus.decisionMemoryCount > 0 ? "pass" : "warn",
      message: `${String(memoryStatus.decisionMemoryCount)} files`,
    });
    results.push({
      name: "Agent memory files",
      status: memoryStatus.agentMemoryCount > 0 ? "pass" : "warn",
      message: `${String(memoryStatus.agentMemoryCount)} files`,
    });
    results.push({
      name: "Indexed memory items",
      status: memoryStatus.indexedItemCount > 0 ? "pass" : "warn",
      message: `${String(memoryStatus.indexedItemCount)} items`,
    });
  } else {
    results.push({
      name: "Runtime memory",
      status: "warn",
      message: "Not found. Run 'codeclaw init' to create.",
    });
  }

  printResults(results);

  const hasFailures = results.some((r) => r.status === "fail");
  if (hasFailures) {
    process.exit(1);
  }
}

function printResults(results: CheckResult[]): void {
  console.log("\n🔍 codeclaw doctor\n");
  for (const result of results) {
    const icon = result.status === "pass" ? "✅" : result.status === "warn" ? "⚠️" : "❌";
    console.log(`  ${icon} ${result.name}: ${result.message}`);
  }
  console.log("");
}
