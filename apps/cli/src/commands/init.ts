import { mkdir, writeFile, access, cp } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultConfig } from "@aiteam/shared";
import { openDatabase, initializeSchema } from "@aiteam/storage";
import { initializeRuntimeMemory } from "@aiteam/memory";

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
  const aiTeamDir = join(process.cwd(), ".ai-team");

  if (await dirExists(aiTeamDir)) {
    if (options.force) {
      console.log("⚡ .ai-team already exists, overwriting due to --force");
    } else {
      console.log("❌ .ai-team already exists. Use --force to overwrite.");
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
  console.log("✅ Created .ai-team/config.json");

  const db = openDatabase(join(aiTeamDir, "database.sqlite"));
  initializeSchema(db);
  db.close();
  console.log("✅ Created .ai-team/database.sqlite");

  const promptsDir = join(aiTeamDir, "prompts");
  await mkdir(promptsDir, { recursive: true });

  const templateFiles = [
    "ba-agent.md",
    "architect-agent.md",
    "pm-agent.md",
    "qa-agent.md",
    "reporter-agent.md",
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
  console.log("✅ Created .ai-team/prompts/");

  await mkdir(join(aiTeamDir, "runs"), { recursive: true });
  console.log("✅ Created .ai-team/runs/");

  const memoryResult = await initializeRuntimeMemory({
    projectRoot: process.cwd(),
    force: options.force,
  });
  console.log(
    `✅ Created .ai-team/memory/ (${String(memoryResult.filesCreated.length)} files created, ${String(memoryResult.filesSkipped.length)} skipped)`,
  );

  console.log("\n🎉 aiteam initialized successfully!");
}
