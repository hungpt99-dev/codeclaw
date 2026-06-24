import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { getArtifactPaths, writeArtifact } from "../artifacts/artifactWriter.js";
import {
  generateDeterministicCodeReview,
  generateDeterministicSecurityReview,
} from "./deterministicReview.js";
import type { DeterministicReviewInput } from "./deterministicReview.js";
import { runCodeReviewerAgent } from "../agents/codeReviewerAgent.js";
import type { CodeReviewerAgentInput } from "../agents/codeReviewerAgent.js";
import { runSecurityReviewerAgent } from "../agents/securityReviewerAgent.js";
import type { SecurityReviewerAgentInput } from "../agents/securityReviewerAgent.js";

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
  reviewType?: "code" | "security" | "all";
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

export async function runReview(
  input: ReviewInput,
  options?: ReviewOptions,
): Promise<ReviewOutput> {
  const aiTool = options?.aiTool;
  const templateDir = options?.templateDir;
  const reviewType = options?.reviewType ?? "all";

  const detInput: DeterministicReviewInput = {
    acceptanceCriteria: input.acceptanceCriteria,
    changedFiles: input.changedFiles,
    diff: input.diff,
    testResults: input.testResults,
    clarifiedRequirement: input.clarifiedRequirement,
  };

  const codeReviewerInput: CodeReviewerAgentInput = {
    clarifiedRequirement: input.clarifiedRequirement,
    acceptanceCriteria: input.acceptanceCriteria,
    technicalDesign: input.technicalDesign,
    changedFiles: input.changedFiles,
    diff: input.diff,
    testResults: input.testResults,
  };

  const securityReviewerInput: SecurityReviewerAgentInput = {
    clarifiedRequirement: input.clarifiedRequirement,
    technicalDesign: input.technicalDesign,
    changedFiles: input.changedFiles,
    diff: input.diff,
  };

  const aiToolConfig =
    aiTool?.command != null
      ? {
          tool: aiTool.tool as "claude" | "codex" | "gemini" | "aider",
          command: aiTool.command,
          timeoutSeconds: aiTool.timeoutSeconds,
        }
      : undefined;

  let codeReviewOutput: Awaited<ReturnType<typeof generateDeterministicCodeReview>> | null = null;
  let securityReviewOutput: Awaited<ReturnType<typeof generateDeterministicSecurityReview>> | null =
    null;

  if (reviewType === "code" || reviewType === "all") {
    if (aiToolConfig && templateDir) {
      try {
        const result = await runCodeReviewerAgent(codeReviewerInput, {
          templateDir,
          aiTool: aiToolConfig,
        });
        codeReviewOutput = {
          reviewReport: result.reviewReport,
          requirementCoverage: result.requirementCoverage,
          overallStatus: result.overallStatus,
        };
      } catch {
        codeReviewOutput = generateDeterministicCodeReview(detInput);
      }
    } else {
      codeReviewOutput = generateDeterministicCodeReview(detInput);
    }
  }

  if (reviewType === "security" || reviewType === "all") {
    if (aiToolConfig && templateDir) {
      try {
        const result = await runSecurityReviewerAgent(securityReviewerInput, {
          templateDir,
          aiTool: aiToolConfig,
        });
        securityReviewOutput = {
          securityReview: result.securityReview,
          securityStatus: result.securityStatus,
        };
      } catch {
        securityReviewOutput = generateDeterministicSecurityReview(detInput);
      }
    } else {
      securityReviewOutput = generateDeterministicSecurityReview(detInput);
    }
  }

  if (reviewType === "code") {
    codeReviewOutput ??= generateDeterministicCodeReview(detInput);
    const fallbackSecurity = generateDeterministicSecurityReview(detInput);
    return {
      reviewReport: codeReviewOutput.reviewReport,
      securityReview: fallbackSecurity.securityReview,
      requirementCoverage: codeReviewOutput.requirementCoverage,
      overallStatus: codeReviewOutput.overallStatus,
    };
  }

  if (reviewType === "security") {
    securityReviewOutput ??= generateDeterministicSecurityReview(detInput);
    const fallbackCode = generateDeterministicCodeReview(detInput);
    return {
      reviewReport: fallbackCode.reviewReport,
      securityReview: securityReviewOutput.securityReview,
      requirementCoverage: fallbackCode.requirementCoverage,
      overallStatus:
        securityReviewOutput.securityStatus === "CRITICAL_ISSUES"
          ? "CHANGES_REQUIRED"
          : fallbackCode.overallStatus,
    };
  }

  const code = codeReviewOutput ?? generateDeterministicCodeReview(detInput);
  const security = securityReviewOutput ?? generateDeterministicSecurityReview(detInput);

  return {
    reviewReport: code.reviewReport,
    securityReview: security.securityReview,
    requirementCoverage: code.requirementCoverage,
    overallStatus: code.overallStatus,
  };
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
