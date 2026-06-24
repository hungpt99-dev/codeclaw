import { mkdir, writeFile, access, cp } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultConfig } from "@codeclaw/shared";
import { openDatabase, initializeSchema } from "@codeclaw/storage";
import { initializeRuntimeMemory } from "@codeclaw/memory";
import { analyzeRepository } from "@codeclaw/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_DIR = join(__dirname, "..", "..", "..", "..", "..", "templates", "prompts");

interface InitOptions {
  force?: boolean;
  type?: string;
  outputLanguage?: string;
}

async function dirExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function initCommand(options: InitOptions): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".codeclaw");

  if (await dirExists(aiTeamDir)) {
    if (options.force) {
      console.log("⚡ .codeclaw already exists, overwriting due to --force");
    } else {
      console.log("❌ .codeclaw already exists. Use --force to overwrite.");
      process.exit(1);
    }
  }

  const config = { ...defaultConfig };

  if (options.type) {
    config.project.type = options.type;
  }
  if (options.outputLanguage) {
    config.workflow.defaultOutputLanguage = options.outputLanguage;
  }

  await mkdir(aiTeamDir, { recursive: true });

  await writeFile(join(aiTeamDir, "config.json"), JSON.stringify(config, null, 2), "utf-8");
  console.log("✅ Created .codeclaw/config.json");

  const db = openDatabase(join(aiTeamDir, "database.sqlite"));
  initializeSchema(db);
  db.close();
  console.log("✅ Created .codeclaw/database.sqlite");

  const promptsDir = join(aiTeamDir, "prompts");
  await mkdir(promptsDir, { recursive: true });

  const templateFiles = [
    "ba-agent.md",
    "architect-agent.md",
    "pm-agent.md",
    "qa-agent.md",
    "reporter-agent.md",
    "developer-agent.md",
  ];

  for (const file of templateFiles) {
    const src = join(TEMPLATES_DIR, file);
    const dest = join(promptsDir, file);
    try {
      await cp(src, dest);
    } catch {
      console.log(`⚠️  Could not copy template: ${file}`);
    }
  }
  console.log("✅ Created .codeclaw/prompts/");

  await mkdir(join(aiTeamDir, "runs"), { recursive: true });
  console.log("✅ Created .codeclaw/runs/");

  const memoryResult = await initializeRuntimeMemory({
    projectRoot: process.cwd(),
    force: options.force,
  });
  console.log(
    `✅ Created .codeclaw/memory/ (${String(memoryResult.filesCreated.length)} files created, ${String(memoryResult.filesSkipped.length)} skipped)`,
  );

  const initAnalysis = await analyzeRepository(process.cwd());
  if (initAnalysis.projectType !== "generic") {
    console.log(`\n📋 Detected project type: ${String(initAnalysis.projectType)}`);
    console.log(`   Language: ${initAnalysis.language ?? "Unknown"}`);
    console.log(`   Framework: ${initAnalysis.framework ?? "Unknown"}`);
    console.log(`   Build tool: ${initAnalysis.buildTool ?? "Unknown"}`);
    if (initAnalysis.testFramework) {
      console.log(`   Test framework: ${initAnalysis.testFramework}`);
    }
    if (initAnalysis.sourceDirs.length > 0) {
      console.log(`   Source dirs: ${initAnalysis.sourceDirs.join(", ")}`);
    }
    if (initAnalysis.testDirs.length > 0) {
      console.log(`   Test dirs: ${initAnalysis.testDirs.join(", ")}`);
    }
  } else {
    console.log("\n📋 No specific project type detected.");
  }

  console.log("\n🎉 codeclaw initialized successfully!");
}
