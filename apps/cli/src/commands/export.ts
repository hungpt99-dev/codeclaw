import { join } from "node:path";
import { resolveProjectDir } from "@codeclaw/core";
import {
  openDatabase,
  initializeSchema,
  createArtifactRepository,
  createRunRepository,
} from "@codeclaw/storage";
import { exportRunArtifacts } from "@codeclaw/adapters";
import type { ArtifactRecord, ExportFormat } from "@codeclaw/adapters";

interface ExportCliOptions {
  format?: string;
  output?: string;
  includeLogs?: boolean;
  includeDiff?: boolean;
  title?: string;
  author?: string;
  project?: string;
}

function bytesToSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(1);
  return `${size} ${units[i] ?? "B"}`;
}

export async function exportCommand(runId: string, options: ExportCliOptions): Promise<void> {
  let aiTeamDir: string;

  try {
    const resolved = await resolveProjectDir(options.project);
    aiTeamDir = resolved.projectDir;
  } catch (err) {
    console.log(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const format = (options.format ?? "markdown") as ExportFormat;
  const validFormats = ["markdown", "html", "docx", "pdf", "zip", "combined-md", "json", "all"];
  if (!validFormats.includes(format)) {
    console.log(`Error: Unsupported format '${format}'. Supported: ${validFormats.join(", ")}`);
    process.exit(1);
  }

  const db = openDatabase(join(aiTeamDir, "database.sqlite"));
  initializeSchema(db);

  const runRepo = createRunRepository(db);
  const run = runRepo.findById(runId);
  if (!run) {
    console.log(`Error: Run '${runId}' not found.`);
    db.close();
    process.exit(1);
  }

  const artifactRepo = createArtifactRepository(db);
  const dbArtifacts = artifactRepo.findByRunId(runId);

  const artifacts: ArtifactRecord[] = dbArtifacts.map((a) => ({
    id: a.id,
    runId: a.runId,
    type: a.type,
    name: a.name,
    path: a.path,
    format: a.format,
  }));

  if (artifacts.length === 0) {
    console.log(`Error: No artifacts found for run '${runId}'.`);
    db.close();
    process.exit(1);
  }

  db.close();

  let outputPath = options.output;
  if (!outputPath) {
    const defaultDir = join(aiTeamDir, "runs", runId, "export");
    if (format === "markdown") {
      outputPath = join(defaultDir, "markdown");
    } else if (format === "combined-md") {
      outputPath = join(defaultDir, "combined-report.md");
    } else if (format === "json") {
      outputPath = join(defaultDir, "delivery-package.json");
    } else if (format === "all") {
      outputPath = join(defaultDir, "delivery-package");
    } else {
      outputPath = join(defaultDir, `report.${format}`);
    }
  }

  const exportOpts: Parameters<typeof exportRunArtifacts>[2] = {
    format,
    outputPath,
    docTitle: options.title ?? run.title,
  };
  if (options.includeLogs) exportOpts.includeLogs = options.includeLogs;
  if (options.includeDiff) exportOpts.includeDiff = options.includeDiff;
  if (options.author) exportOpts.docAuthor = options.author;

  const result = await exportRunArtifacts(runId, artifacts, exportOpts);

  if (result.success) {
    const sizeStr = bytesToSize(result.fileSize);
    console.log(`Exported run '${runId}' as ${format.toUpperCase()}`);
    if (format === "all" && result.outputPath.includes(", ")) {
      const paths = result.outputPath.split(", ");
      for (const p of paths) {
        console.log(`  ${p}`);
      }
    } else {
      console.log(`Output: ${result.outputPath}`);
    }
    console.log(`Total size: ${sizeStr}`);
  } else {
    console.log(`Export failed: ${result.error ?? "Unknown error"}`);
    process.exit(1);
  }
}
