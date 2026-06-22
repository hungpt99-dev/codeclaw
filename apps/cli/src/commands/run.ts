import { access, readFile } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { createRunId, nowIso, configSchema } from "@aiteam/shared";
import type { Config, RunMode } from "@aiteam/shared";
import { runDocsOnlyWorkflow } from "@aiteam/core";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createArtifactRepository,
} from "@aiteam/storage";
import type { ArtifactType } from "@aiteam/shared";

interface RunOptions {
  title?: string;
  outputLanguage?: string;
  json?: boolean;
}

function inferArtifactType(filePath: string): ArtifactType {
  const name = basename(filePath, extname(filePath));
  const typeMap: Record<string, ArtifactType> = {
    input: "RAW_REQUIREMENT",
    "clarified-requirement": "CLARIFIED_REQUIREMENT",
    "business-rules": "BUSINESS_RULES",
    "acceptance-criteria": "ACCEPTANCE_CRITERIA",
    "open-questions": "OPEN_QUESTIONS",
    assumptions: "ASSUMPTIONS",
    "technical-design": "TECHNICAL_DESIGN",
    "api-design": "API_DESIGN",
    "db-design": "DB_DESIGN",
    "task-breakdown": "TASK_BREAKDOWN",
    "test-matrix": "TEST_MATRIX",
    "final-report": "FINAL_REPORT",
  };
  return typeMap[name] ?? "RAW_REQUIREMENT";
}

function inferFormat(filePath: string): string {
  const ext = extname(filePath);
  if (ext === ".json") return "json";
  return "markdown";
}

async function loadConfig(): Promise<Config> {
  const configPath = join(process.cwd(), ".ai-team", "config.json");
  const raw = await readFile(configPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  return configSchema.parse(parsed);
}

export async function runCommand(requirement: string, options: RunOptions): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".ai-team");

  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .ai-team not found. Run 'aiteam init' first.");
    process.exit(1);
  }

  const config = await loadConfig();
  const runId = createRunId(requirement);
  const title = options.title ?? requirement.slice(0, 80);

  const db = openDatabase(join(aiTeamDir, "database.sqlite"));
  initializeSchema(db);

  const runRepo = createRunRepository(db);
  const artifactRepo = createArtifactRepository(db);

  runRepo.create({
    id: runId,
    title,
    rawRequirement: requirement,
    mode: config.workflow.defaultMode as RunMode,
  });

  const result = await runDocsOnlyWorkflow({ requirement });

  const artifactRecords = result.artifacts.map((artifactPath, index) => {
    const type = inferArtifactType(artifactPath);
    const format = inferFormat(artifactPath);
    const name = basename(artifactPath);
    return artifactRepo.create({
      id: `${runId}_artifact_${String(index)}`,
      runId,
      type,
      name,
      path: artifactPath,
      format,
    });
  });

  runRepo.updateStatus(runId, "REPORT_GENERATED");
  db.close();

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          runId,
          status: "REPORT_GENERATED",
          artifacts: artifactRecords.map((a) => ({
            type: a.type,
            name: a.name,
            path: a.path,
          })),
          createdAt: result.createdAt,
          completedAt: nowIso(),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`\n🚀 Run completed: ${runId}`);
    console.log(`   Status: REPORT_GENERATED`);
    console.log(`\n📄 Artifacts:`);
    for (const artifact of artifactRecords) {
      console.log(`   - [${artifact.type}] ${artifact.path}`);
    }
    console.log("");
  }
}
