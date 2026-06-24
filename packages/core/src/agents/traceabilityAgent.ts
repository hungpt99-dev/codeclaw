import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@aiteam/adapters";
import type { AiCliTool } from "@aiteam/adapters";
import type { ArtifactPaths } from "../artifacts/artifactWriter.js";
import {
  generateTraceability,
  traceabilityToMarkdown,
} from "../traceability/traceabilityEngine.js";
import { parseTraceabilityOutput } from "./parsers/traceabilityOutputParser.js";
import type { TraceabilityMatrix } from "@aiteam/shared";

export interface TraceabilityAgentInput {
  runId: string;
  artifactPaths: ArtifactPaths;
  changedFilesPath?: string;
  existingMatrix?: TraceabilityMatrix;
}

export interface TraceabilityAgentOutput {
  matrix: TraceabilityMatrix;
  markdown: string;
  coverageAnalysis: string;
  gapDetection: string;
  recommendations: string;
}

const COVERAGE_ANALYSIS_TEMPLATE = `## Coverage Analysis

### Status Overview
- Total Requirements: {{total}}
- Covered: {{covered}}
- Partial: {{partial}}
- Not Covered: {{notCovered}}

### Per-Requirement Breakdown
{{perRequirementBreakdown}}

### Analysis
The traceability matrix shows {{percentCovered}}% of requirements are fully covered.
{{coverageNarrative}}
`;

const GAP_DETECTION_TEMPLATE = `## Gap Detection

### Requirements Without Tasks
{{noTasks}}

### Requirements Without Tests
{{noTests}}

### Gaps Identified
{{gapNarrative}}
`;

const RECOMMENDATIONS_TEMPLATE = `## Recommendations

{{recommendationsList}}
`;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "traceability-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

function buildPerRequirementBreakdown(matrix: TraceabilityMatrix): string {
  if (matrix.items.length === 0) return "No requirements found.";
  return matrix.items
    .map(
      (item) =>
        `- **${item.requirementId}**: ${item.requirementText} — Status: ${item.status}` +
        ` (Tasks: ${String(item.taskIds.length)}, Tests: ${String(item.testCases.length)}, Code Files: ${String(item.codeFiles.length)})`,
    )
    .join("\n");
}

function buildCoverageNarrative(matrix: TraceabilityMatrix): string {
  const { total, covered, partial, notCovered } = matrix.summary;
  const parts: string[] = [];
  if (total === 0) {
    parts.push("No requirements were found to analyze.");
    return parts.join(" ");
  }
  if (covered === total) {
    parts.push("All requirements are fully covered with tasks and tests.");
  } else {
    if (partial > 0) {
      parts.push(
        `${String(partial)} requirement(s) have partial coverage — they may have tasks but lack tests, or vice versa.`,
      );
    }
    if (notCovered > 0) {
      parts.push(
        `${String(notCovered)} requirement(s) have no coverage at all — they need both tasks and tests.`,
      );
    }
  }
  return parts.join(" ");
}

function buildGapNarrative(matrix: TraceabilityMatrix): string {
  const noTasks = matrix.items.filter((i) => i.taskIds.length === 0);
  const noTests = matrix.items.filter((i) => i.testCases.length === 0);
  const parts: string[] = [];
  if (noTasks.length > 0) {
    parts.push(
      `${String(noTasks.length)} requirement(s) have no task breakdown: ${noTasks.map((i) => i.requirementId).join(", ")}.`,
    );
  }
  if (noTests.length > 0) {
    parts.push(
      `${String(noTests.length)} requirement(s) have no test coverage: ${noTests.map((i) => i.requirementId).join(", ")}.`,
    );
  }
  if (noTasks.length === 0 && noTests.length === 0) {
    parts.push("No gaps detected — all requirements have tasks and tests.");
  }
  return parts.join(" ");
}

function buildRecommendations(matrix: TraceabilityMatrix): string {
  const { total, covered, notCovered } = matrix.summary;
  const lines: string[] = [];
  if (notCovered > 0) {
    lines.push(
      `- Create tasks and tests for the ${String(notCovered)} uncovered requirement(s) to improve coverage.`,
    );
  }
  const partial = matrix.items.filter((i) => i.status === "PARTIAL");
  if (partial.length > 0) {
    lines.push(
      `- Complete coverage for ${String(partial.length)} partially covered requirement(s) by adding missing tests or tasks.`,
    );
  }
  const noCodeFiles = matrix.items.filter((i) => i.codeFiles.length === 0);
  if (noCodeFiles.length > 0) {
    lines.push(
      `- Map code files to ${String(noCodeFiles.length)} requirement(s) that have no code files linked.`,
    );
  }
  if (total > 0 && covered === total) {
    lines.push("- All requirements are fully covered. Maintain current coverage levels.");
  }
  if (lines.length === 0) {
    lines.push("- No actionable recommendations. The traceability matrix is empty.");
  }
  return lines.join("\n");
}

export async function runTraceabilityAgent(
  input: TraceabilityAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<TraceabilityAgentOutput> {
  const matrix =
    input.existingMatrix ??
    (await generateTraceability(input.runId, input.artifactPaths, input.changedFilesPath));

  const markdown = traceabilityToMarkdown(matrix);

  if (options?.aiTool) {
    const template = await loadTemplate(options.templateDir);
    if (template) {
      const changedFiles = input.changedFilesPath
        ? await readFile(input.changedFilesPath, "utf-8").catch(() => "No changed files available.")
        : "No changed files available.";

      const result = await runAgent({
        role: "TRACEABILITY",
        promptTemplate: template,
        context: {
          traceabilityMatrix: markdown,
          changedFiles,
        },
        aiToolConfig: options.aiTool,
      });

      if (result.success && result.usedAi) {
        const parsed = parseTraceabilityOutput(result.output);
        return {
          matrix,
          markdown,
          coverageAnalysis: parsed.coverageAnalysis,
          gapDetection: parsed.gapDetection,
          recommendations: parsed.recommendations,
        };
      }
    }
  }

  const total = matrix.summary.total;
  const covered = matrix.summary.covered;
  const partial = matrix.summary.partial;
  const notCovered = matrix.summary.notCovered;

  const percentCovered = total > 0 ? Math.round((covered / total) * 100) : 0;
  const perRequirementBreakdown = buildPerRequirementBreakdown(matrix);
  const coverageNarrative = buildCoverageNarrative(matrix);
  const gapNarrative = buildGapNarrative(matrix);
  const recommendationsList = buildRecommendations(matrix);

  const noTasks = matrix.items.filter((i) => i.taskIds.length === 0);
  const noTests = matrix.items.filter((i) => i.testCases.length === 0);

  const coverageAnalysis = renderPrompt(COVERAGE_ANALYSIS_TEMPLATE, {
    total: String(total),
    covered: String(covered),
    partial: String(partial),
    notCovered: String(notCovered),
    perRequirementBreakdown,
    percentCovered: String(percentCovered),
    coverageNarrative,
  });

  const gapDetection = renderPrompt(GAP_DETECTION_TEMPLATE, {
    noTasks:
      noTasks.length > 0
        ? noTasks.map((i) => `- ${i.requirementId}: ${i.requirementText}`).join("\n")
        : "None — all requirements have tasks.",
    noTests:
      noTests.length > 0
        ? noTests.map((i) => `- ${i.requirementId}: ${i.requirementText}`).join("\n")
        : "None — all requirements have tests.",
    gapNarrative,
  });

  const recommendations = renderPrompt(RECOMMENDATIONS_TEMPLATE, {
    recommendationsList,
  });

  return {
    matrix,
    markdown,
    coverageAnalysis,
    gapDetection,
    recommendations,
  };
}

export function traceabilityToEnhancedMarkdown(output: TraceabilityAgentOutput): string {
  const lines: string[] = [];
  lines.push(output.markdown);
  lines.push("");
  lines.push("## Coverage Analysis");
  lines.push("");
  lines.push(output.coverageAnalysis);
  lines.push("");
  lines.push("## Gap Detection");
  lines.push("");
  lines.push(output.gapDetection);
  lines.push("");
  lines.push("## Recommendations");
  lines.push("");
  lines.push(output.recommendations);
  lines.push("");
  return lines.join("\n");
}
