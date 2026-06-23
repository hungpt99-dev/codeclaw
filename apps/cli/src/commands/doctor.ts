import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { configSchema } from "@aiteam/shared";
import { openDatabase } from "@aiteam/storage";
import { getMemoryStatus } from "@aiteam/memory";
import { analyzeRepository } from "@aiteam/core";

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
  const aiTeamDir = join(process.cwd(), ".ai-team");
  const results: CheckResult[] = [];

  const aiTeamExists = await fileExists(aiTeamDir);
  results.push({
    name: ".ai-team directory",
    status: aiTeamExists ? "pass" : "fail",
    message: aiTeamExists ? "Exists" : "Not found. Run 'aiteam init' first.",
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

  const aiTools = ["claude", "codex", "gemini", "aider"];
  for (const tool of aiTools) {
    try {
      execSync(`which ${tool}`, { stdio: "pipe" });
      results.push({
        name: `${tool} CLI`,
        status: "pass",
        message: "Available",
      });
    } catch {
      results.push({
        name: `${tool} CLI`,
        status: "warn",
        message: "Not found in PATH",
      });
    }
  }

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
      message: "Not found. Run 'aiteam init' to create.",
    });
  }

  printResults(results);

  const hasFailures = results.some((r) => r.status === "fail");
  if (hasFailures) {
    process.exit(1);
  }
}

function printResults(results: CheckResult[]): void {
  console.log("\n🔍 aiteam doctor\n");
  for (const result of results) {
    const icon = result.status === "pass" ? "✅" : result.status === "warn" ? "⚠️" : "❌";
    console.log(`  ${icon} ${result.name}: ${result.message}`);
  }
  console.log("");
}
