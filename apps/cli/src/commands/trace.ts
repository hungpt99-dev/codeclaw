import { join } from "node:path";
import { readFile, access } from "node:fs/promises";
import { openDatabase, initializeSchema, createTraceabilityRepository } from "@aiteam/storage";
import { generateTraceability, traceabilityToMarkdown } from "@aiteam/core";
import { getArtifactPaths } from "@aiteam/core";

interface TraceOptions {
  run: string;
  format?: string;
  regenerate?: boolean;
}

function loadRunId(options: TraceOptions): string {
  if (options.run) return options.run;
  throw new Error("--run <runId> is required");
}

function printMarkdown(matrixStr: string): void {
  console.log(matrixStr);
}

function printJson(matrixStr: string): void {
  console.log(matrixStr);
}

export async function traceCommand(options: TraceOptions): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".ai-team");
  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .ai-team not found. Run 'aiteam init' first.");
    process.exit(1);
  }

  const runId = loadRunId(options);
  const format = options.format ?? "all";

  const db = openDatabase(join(aiTeamDir, "database.sqlite"));
  initializeSchema(db);

  const traceRepo = createTraceabilityRepository(db);
  const paths = getArtifactPaths(runId);

  if (options.regenerate) {
    const matrix = await generateTraceability(runId, paths);

    const { writeFile } = await import("node:fs/promises");
    await writeFile(paths.traceabilityMd, traceabilityToMarkdown(matrix));
    await writeFile(paths.traceabilityJson, JSON.stringify(matrix, null, 2));

    const existing = traceRepo.findByRunId(runId);
    if (existing.length > 0) {
      traceRepo.deleteByRunId(runId);
    }

    for (const item of matrix.items) {
      traceRepo.create({
        id: `${runId}_trace_${item.requirementId}`,
        runId,
        requirementId: item.requirementId,
        requirementText: item.requirementText,
        acceptanceCriteriaIds: item.acceptanceCriteriaIds,
        taskIds: item.taskIds,
        codeFiles: item.codeFiles,
        testCases: item.testCases,
        testResults: item.testResults,
        status: item.status,
      });
    }

    console.log(`✅ Traceability regenerated for run: ${runId}`);
  }

  const records = traceRepo.findByRunId(runId);

  if (records.length === 0 && !options.regenerate) {
    console.log(`No traceability data found for run: ${runId}`);
    console.log("Try: aiteam trace --run <runId> --regenerate");
    db.close();
    return;
  }

  const summary = traceRepo.getSummary(runId);

  if (format === "json" || format === "all") {
    const jsonContent = await readFile(paths.traceabilityJson, "utf-8").catch(() => {
      const matrix = {
        runId,
        items: records.map((r) => ({
          requirementId: r.requirementId,
          requirementText: r.requirementText,
          acceptanceCriteriaIds: r.acceptanceCriteriaIds,
          taskIds: r.taskIds,
          codeFiles: r.codeFiles,
          testCases: r.testCases,
          testResults: r.testResults,
          status: r.status,
        })),
        generatedAt: new Date().toISOString(),
        summary,
      };
      return JSON.stringify(matrix, null, 2);
    });
    if (format === "json") {
      printJson(jsonContent);
      db.close();
      return;
    }
    console.log("\n--- JSON Output ---");
    printJson(jsonContent);
  }

  if (format === "markdown" || format === "all") {
    const mdContent = await readFile(paths.traceabilityMd, "utf-8").catch(() => {
      return "Traceability markdown not available. Run with --regenerate to create it.";
    });
    if (format === "markdown") {
      printMarkdown(mdContent);
      db.close();
      return;
    }
    console.log("\n--- Markdown Output ---");
    printMarkdown(mdContent);
  }

  const totalStr = String(summary.total);
  const coveredStr = String(summary.covered);
  const partialStr = String(summary.partial);
  const notCoveredStr = String(summary.notCovered);
  console.log(
    `\n📊 Summary: ${totalStr} total, ${coveredStr} covered, ${partialStr} partial, ${notCoveredStr} not covered`,
  );

  db.close();
}
