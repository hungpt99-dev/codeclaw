import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { nowIso } from "@aiteam/shared";
import type { CoverageStatus, TraceabilityItem, TraceabilityMatrix } from "@aiteam/shared";
import type { ArtifactPaths } from "../artifacts/artifactWriter.js";
import {
  parseRequirementId,
  parseAcceptanceCriteria,
  parseTaskBreakdown,
  parseTestMatrix,
} from "./traceabilityParser.js";

async function readFileSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

function determineStatus(item: { taskIds: string[]; testCases: string[] }): CoverageStatus {
  const hasTasks = item.taskIds.length > 0;
  const hasTests = item.testCases.length > 0;
  if (hasTasks && hasTests) return "COVERED";
  if (hasTasks || hasTests) return "PARTIAL";
  return "NOT_COVERED";
}

export async function generateTraceability(
  runId: string,
  artifactPaths: ArtifactPaths,
): Promise<TraceabilityMatrix> {
  const [clarifiedReqContent, acceptanceCriteriaContent, taskBreakdownContent, testMatrixContent] =
    await Promise.all([
      readFileSafe(join(artifactPaths.requirementDir, "clarified-requirement.md")),
      readFileSafe(join(artifactPaths.requirementDir, "acceptance-criteria.md")),
      readFileSafe(join(artifactPaths.tasksDir, "task-breakdown.md")),
      readFileSafe(join(artifactPaths.testsDir, "test-matrix.md")),
    ]);

  const req = parseRequirementId(clarifiedReqContent);
  const acList = parseAcceptanceCriteria(acceptanceCriteriaContent);
  const tasks = parseTaskBreakdown(taskBreakdownContent);
  const tests = parseTestMatrix(testMatrixContent);

  const items: TraceabilityItem[] = [];

  if (req) {
    items.push({
      requirementId: req.id,
      requirementText: req.text,
      acceptanceCriteriaIds: acList.map((a) => a.id),
      taskIds: tasks.map((t) => t.id),
      codeFiles: [],
      testCases: tests.map((t) => t.id),
      testResults: [],
      status: determineStatus({
        taskIds: tasks.map((t) => t.id),
        testCases: tests.map((t) => t.id),
      }),
    });
  } else if (acList.length > 0 || tasks.length > 0 || tests.length > 0) {
    items.push({
      requirementId: "REQ-001",
      requirementText: "Unnamed requirement",
      acceptanceCriteriaIds: acList.map((a) => a.id),
      taskIds: tasks.map((t) => t.id),
      codeFiles: [],
      testCases: tests.map((t) => t.id),
      testResults: [],
      status: determineStatus({
        taskIds: tasks.map((t) => t.id),
        testCases: tests.map((t) => t.id),
      }),
    });
  }

  let covered = 0;
  let partial = 0;
  let notCovered = 0;
  for (const item of items) {
    if (item.status === "COVERED") covered++;
    else if (item.status === "PARTIAL") partial++;
    else if (item.status === "NOT_COVERED") notCovered++;
  }

  return {
    runId,
    items,
    generatedAt: nowIso(),
    summary: {
      total: items.length,
      covered,
      partial,
      notCovered,
    },
  };
}

export function traceabilityToMarkdown(matrix: TraceabilityMatrix): string {
  const lines: string[] = [];
  lines.push("# Traceability Matrix");
  lines.push("");
  lines.push(`**Run ID**: ${matrix.runId}`);
  lines.push(`**Generated**: ${matrix.generatedAt}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Items | ${String(matrix.summary.total)} |`);
  lines.push(`| Covered | ${String(matrix.summary.covered)} |`);
  lines.push(`| Partial | ${String(matrix.summary.partial)} |`);
  lines.push(`| Not Covered | ${String(matrix.summary.notCovered)} |`);
  lines.push("");
  lines.push("## Items");
  lines.push("");
  lines.push("| Requirement | Text | AC | Tasks | Code Files | Tests | Status |");
  lines.push("|-------------|------|----|-------|------------|-------|--------|");

  for (const item of matrix.items) {
    const statusBadge =
      item.status === "COVERED"
        ? "✓ COVERED"
        : item.status === "PARTIAL"
          ? "~ PARTIAL"
          : item.status === "NOT_COVERED"
            ? "✗ NOT COVERED"
            : "? UNKNOWN";
    lines.push(
      `| ${item.requirementId} | ${item.requirementText} | ${item.acceptanceCriteriaIds.join(", ")} | ${item.taskIds.join(", ")} | ${item.codeFiles.join(", ")} | ${item.testCases.join(", ")} | ${statusBadge} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}
