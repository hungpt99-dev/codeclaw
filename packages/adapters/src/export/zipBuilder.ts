import { mkdir, writeFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { ArtifactRecord, RunInfo } from "./utils.js";

const ARTIFACT_DIR_MAP: Record<string, string> = {
  RAW_REQUIREMENT: "requirement",
  CLARIFIED_REQUIREMENT: "requirement",
  BUSINESS_RULES: "requirement",
  ACCEPTANCE_CRITERIA: "requirement",
  OPEN_QUESTIONS: "requirement",
  ASSUMPTIONS: "requirement",
  SCOPE_DEFINITION: "scope",
  TECHNICAL_DESIGN: "design",
  API_DESIGN: "design",
  DB_DESIGN: "design",
  TASK_BREAKDOWN: "tasks",
  JIRA_READY_TASKS: "tasks",
  CODING_PLAN: "tasks",
  TEST_MATRIX: "tests",
  TEST_RESULT: "tests",
  FAILED_TESTS: "tests",
  IMPLEMENTATION_PROMPT: "implementation",
  AGENT_LOG: "implementation",
  DIFF_PATCH: "implementation",
  CHANGED_FILES: "implementation",
  FINAL_REPORT: "report",
};

function getArtifactDir(type: string): string {
  return ARTIFACT_DIR_MAP[type] ?? "other";
}

function buildMetadata(runInfo: RunInfo, artifacts: ArtifactRecord[]): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`run_id: ${runInfo.id}`);
  lines.push(`title: ${runInfo.title}`);
  lines.push(`mode: ${runInfo.mode}`);
  lines.push(`status: ${runInfo.status}`);
  lines.push(`language: ${runInfo.outputLanguage}`);
  lines.push(`created_at: ${runInfo.createdAt}`);
  lines.push(`exported_at: ${new Date().toISOString()}`);
  lines.push(`total_artifacts: ${String(artifacts.length)}`);
  lines.push("---");
  return lines.join("\n");
}

function buildArtifactIndex(artifacts: ArtifactRecord[]): string {
  const lines: string[] = [];
  lines.push("# Artifact Index");
  lines.push("");
  lines.push(`| # | Name | Type | Directory |`);
  lines.push("|---|---|---|---|");
  artifacts.forEach((a, i) => {
    const dir = getArtifactDir(a.type);
    lines.push(`| ${String(i + 1)} | ${a.name} | ${a.type} | ${dir} |`);
  });
  return lines.join("\n");
}

interface ZipBuilderOptions {
  outputPath: string;
}

export class ZipBuilder {
  private tempDir: string;

  constructor() {
    this.tempDir = join(tmpdir(), `ai-team-export-${randomUUID()}`);
  }

  async build(
    runInfo: RunInfo,
    artifacts: ArtifactRecord[],
    options: ZipBuilderOptions,
  ): Promise<{ outputPath: string; fileSize: number }> {
    const rootDir = join(this.tempDir, "delivery-package");
    await mkdir(rootDir, { recursive: true });

    await writeFile(join(rootDir, "metadata.yaml"), buildMetadata(runInfo, artifacts), "utf-8");
    await writeFile(join(rootDir, "artifact-index.md"), buildArtifactIndex(artifacts), "utf-8");

    for (const artifact of artifacts) {
      if (!artifact.content) continue;
      const dir = getArtifactDir(artifact.type);
      const artifactDir = join(rootDir, dir);
      await mkdir(artifactDir, { recursive: true });
      await writeFile(join(artifactDir, artifact.name), artifact.content, "utf-8");
    }

    const outputPath = options.outputPath.endsWith(".zip")
      ? options.outputPath
      : `${options.outputPath}.zip`;

    try {
      const { execa } = await import("execa");
      await execa("zip", ["-r", outputPath, "."], { cwd: rootDir });
      const stats = await stat(outputPath);
      return { outputPath, fileSize: stats.size };
    } catch (error) {
      throw new Error(
        `ZIP export failed: ${error instanceof Error ? error.message : String(error)}\n` +
          "Ensure the 'zip' command is available on your system.",
      );
    }
  }

  async cleanup(): Promise<void> {
    await rm(this.tempDir, { recursive: true, force: true });
  }
}
