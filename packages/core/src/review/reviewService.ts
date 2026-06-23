import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { getArtifactPaths, writeArtifact } from "../artifacts/artifactWriter.js";
import { generateDeterministicReview } from "./deterministicReview.js";
import type { DeterministicReviewInput } from "./deterministicReview.js";

export interface ReviewInput {
  runId: string;
  clarifiedRequirement: string;
  acceptanceCriteria: string;
  technicalDesign: string;
  changedFiles: string;
  diff: string;
  testResults: string;
}

export interface ReviewOutput {
  reviewReport: string;
  securityReview: string;
  requirementCoverage: string;
  overallStatus: "APPROVED" | "APPROVED_WITH_WARNINGS" | "CHANGES_REQUIRED";
}

export interface ReviewOptions {
  templateDir?: string;
  aiTool?: {
    tool: string;
    command: string;
    timeoutSeconds: number;
  };
}

async function loadArtifact(path: string): Promise<string> {
  try {
    await access(path);
    return await readFile(path, "utf-8");
  } catch {
    return "";
  }
}

async function loadReviewContext(runId: string): Promise<{
  clarifiedRequirement: string;
  acceptanceCriteria: string;
  technicalDesign: string;
  changedFiles: string;
  diff: string;
  testResults: string;
}> {
  const paths = getArtifactPaths(runId);

  const [
    clarifiedRequirement,
    acceptanceCriteria,
    technicalDesign,
    changedFilesRaw,
    diff,
    testResults,
  ] = await Promise.all([
    loadArtifact(join(paths.requirementDir, "clarified-requirement.md")),
    loadArtifact(join(paths.requirementDir, "acceptance-criteria.md")),
    loadArtifact(join(paths.designDir, "technical-design.md")),
    loadArtifact(paths.changedFilesPath),
    loadArtifact(paths.diffPatchPath),
    loadArtifact(paths.testResultPath),
  ]);

  return {
    clarifiedRequirement,
    acceptanceCriteria,
    technicalDesign,
    changedFiles: changedFilesRaw || "No changed files data available",
    diff: diff || "No diff available",
    testResults: testResults || "No test results available",
  };
}

async function runAiReview(
  templatePath: string,
  context: Record<string, string>,
  aiTool: NonNullable<ReviewOptions["aiTool"]>,
): Promise<string> {
  const templateContent = await readFile(templatePath, "utf-8");
  const rendered = templateContent.replace(
    /\{\{(\w+)\}\}/g,
    (_match: string, key: string) => context[key] ?? `{{${key}}}`,
  );

  const { runAgentPrompt } = await import("@aiteam/adapters");
  const result = await runAgentPrompt(rendered, {
    command: aiTool.command,
    timeoutSeconds: aiTool.timeoutSeconds,
  });

  return result.output;
}

export async function runReview(
  input: ReviewInput,
  options?: ReviewOptions,
): Promise<ReviewOutput> {
  const aiTool = options?.aiTool;
  const templateDir = options?.templateDir;

  if (aiTool?.command != null && templateDir) {
    const reviewerTemplate = join(templateDir, "reviewer-agent.md");
    const securityTemplate = join(templateDir, "security-reviewer-agent.md");

    const context: Record<string, string> = {
      clarifiedRequirement: input.clarifiedRequirement,
      acceptanceCriteria: input.acceptanceCriteria,
      technicalDesign: input.technicalDesign,
      changedFiles: input.changedFiles,
      diff: input.diff,
      testResults: input.testResults,
    };

    try {
      const [reviewOutput, securityOutput] = await Promise.all([
        runAiReview(reviewerTemplate, context, aiTool),
        runAiReview(securityTemplate, context, aiTool),
      ]);

      const overallStatus = parseOverallStatus(reviewOutput);

      const requirementCoverage = extractSection(reviewOutput, "Requirement Coverage");

      return {
        reviewReport: reviewOutput,
        securityReview: securityOutput,
        requirementCoverage,
        overallStatus,
      };
    } catch {
      return runDeterministicReview(input);
    }
  }

  return runDeterministicReview(input);
}

function parseOverallStatus(output: string): ReviewOutput["overallStatus"] {
  const pattern = /## Review Summary\s*\n\s*\[?(APPROVED(?:_WITH_WARNINGS)?|CHANGES_REQUIRED)\]?/i;
  const match = pattern.exec(output);
  if (match) {
    const val = match[1]?.toUpperCase() as ReviewOutput["overallStatus"];
    if (val === "APPROVED" || val === "APPROVED_WITH_WARNINGS") {
      return val;
    }
    return "CHANGES_REQUIRED";
  }
  return "CHANGES_REQUIRED";
}

function extractSection(output: string, sectionName: string): string {
  const lines = output.split("\n");
  let inSection = false;
  const sectionLines: string[] = [];
  const headerPattern = new RegExp(
    `^##\\s+${sectionName.replace(/[-[\]{}()*+?.\\^$|#\s]/g, "\\$&")}`,
  );

  for (const line of lines) {
    if (headerPattern.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection) {
      if (/^##\s/.test(line) && !headerPattern.test(line)) {
        break;
      }
      sectionLines.push(line);
    }
  }
  return sectionLines.join("\n").trim() || `${sectionName} section not available`;
}

function runDeterministicReview(input: ReviewInput): ReviewOutput {
  const detInput: DeterministicReviewInput = {
    acceptanceCriteria: input.acceptanceCriteria,
    changedFiles: input.changedFiles,
    diff: input.diff,
    testResults: input.testResults,
    clarifiedRequirement: input.clarifiedRequirement,
  };

  return generateDeterministicReview(detInput);
}

export async function loadAndReview(runId: string, options?: ReviewOptions): Promise<ReviewOutput> {
  const context = await loadReviewContext(runId);
  return runReview(
    {
      runId,
      ...context,
    },
    options,
  );
}

export async function persistReview(
  runId: string,
  output: ReviewOutput,
): Promise<{
  reviewReportPath: string;
  securityReviewPath: string;
  requirementCoveragePath: string;
}> {
  const paths = getArtifactPaths(runId);

  await writeArtifact(paths.reviewReportPath, output.reviewReport);
  await writeArtifact(paths.securityReviewPath, output.securityReview);
  await writeArtifact(paths.requirementCoveragePath, output.requirementCoverage);

  return {
    reviewReportPath: paths.reviewReportPath,
    securityReviewPath: paths.securityReviewPath,
    requirementCoveragePath: paths.requirementCoveragePath,
  };
}
