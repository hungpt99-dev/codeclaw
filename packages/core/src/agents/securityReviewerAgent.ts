import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent } from "@codeclaw/adapters";
import type { AiCliTool } from "@codeclaw/adapters";
import { parseSecurityReviewerOutput } from "./parsers/securityReviewerOutputParser.js";
import { generateDeterministicSecurityReview } from "../review/deterministicReview.js";
import type { DeterministicReviewInput } from "../review/deterministicReview.js";

export interface SecurityReviewerAgentInput {
  clarifiedRequirement: string;
  technicalDesign: string;
  changedFiles: string;
  diff: string;
}

export interface SecurityReviewerAgentOutput {
  securityReview: string;
  securityStatus: "SECURE" | "MINOR_ISSUES" | "CRITICAL_ISSUES";
}

const SECURITY_REVIEW_TEMPLATE = `# Security Review Report

## Security Review Summary
SECURE

## Vulnerabilities Found
| Severity | Issue | File | Recommendation |
|----------|-------|------|----------------|
| INFO | No vulnerabilities detected | — | — |

## Critical Issues
None

## Recommendations
1. Ensure all secrets are stored in environment variables
2. Verify .gitignore includes common secret file patterns
3. Run a dependency vulnerability scanner before deployment
`;

const FALLBACK_TEMPLATE = SECURITY_REVIEW_TEMPLATE;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "security-reviewer-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

function buildContext(input: SecurityReviewerAgentInput): Record<string, string> {
  return {
    clarifiedRequirement: input.clarifiedRequirement,
    technicalDesign: input.technicalDesign,
    changedFiles: input.changedFiles,
    diff: input.diff,
  };
}

export async function runSecurityReviewerAgent(
  input: SecurityReviewerAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<SecurityReviewerAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATE;

  if (options?.aiTool) {
    const result = await runAgent({
      role: "SECURITY_REVIEWER",
      promptTemplate: template,
      context: buildContext(input),
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parseSecurityReviewerOutput(result.output, input.clarifiedRequirement);
    }
  }

  const detInput: DeterministicReviewInput = {
    acceptanceCriteria: "",
    changedFiles: input.changedFiles,
    diff: input.diff,
    testResults: "",
    clarifiedRequirement: input.clarifiedRequirement,
  };

  return generateDeterministicSecurityReview(detInput);
}
