import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent } from "@aiteam/adapters";
import type { AiCliTool } from "@aiteam/adapters";
import { parseCodeReviewerOutput } from "./parsers/codeReviewerOutputParser.js";
import { generateDeterministicCodeReview } from "../review/deterministicReview.js";
import type { DeterministicReviewInput } from "../review/deterministicReview.js";

export interface CodeReviewerAgentInput {
  clarifiedRequirement: string;
  acceptanceCriteria: string;
  technicalDesign: string;
  changedFiles: string;
  diff: string;
  testResults: string;
}

export interface CodeReviewerAgentOutput {
  reviewReport: string;
  requirementCoverage: string;
  overallStatus: "APPROVED" | "APPROVED_WITH_WARNINGS" | "CHANGES_REQUIRED";
}

const REVIEW_REPORT_TEMPLATE = `# Review Report

## Review Summary
APPROVED

## Requirement Coverage
| Criteria | Status | Notes |
|----------|--------|-------|
| Core functionality works | COVERED | Implementation satisfies primary requirement |

## Code Quality
- No obvious code quality issues detected

## Test Quality
- Tests present and passing

## Security
- No security issues detected in code review scope

## Required Fixes
None identified.
`;

const FALLBACK_TEMPLATE = REVIEW_REPORT_TEMPLATE;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "reviewer-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

function buildContext(input: CodeReviewerAgentInput): Record<string, string> {
  return {
    clarifiedRequirement: input.clarifiedRequirement,
    acceptanceCriteria: input.acceptanceCriteria,
    technicalDesign: input.technicalDesign,
    changedFiles: input.changedFiles,
    diff: input.diff,
    testResults: input.testResults,
  };
}

export async function runCodeReviewerAgent(
  input: CodeReviewerAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<CodeReviewerAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATE;

  if (options?.aiTool) {
    const result = await runAgent({
      role: "CODE_REVIEWER",
      promptTemplate: template,
      context: buildContext(input),
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parseCodeReviewerOutput(result.output, input.clarifiedRequirement);
    }
  }

  const detInput: DeterministicReviewInput = {
    acceptanceCriteria: input.acceptanceCriteria,
    changedFiles: input.changedFiles,
    diff: input.diff,
    testResults: input.testResults,
    clarifiedRequirement: input.clarifiedRequirement,
  };

  return generateDeterministicCodeReview(detInput);
}
