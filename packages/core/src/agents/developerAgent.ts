import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@aiteam/adapters";
import type { AiCliTool } from "@aiteam/adapters";

export interface DeveloperAgentInput {
  requirement: string;
  clarifiedRequirement: string;
  businessRules: string;
  acceptanceCriteria: string;
  technicalDesign: string;
  apiDesign: string;
  dbDesign: string;
  taskBreakdownMd: string;
  testMatrixMd: string;
  codingPlanMd: string;
  targetAgent?: "claude-code" | "codex" | "gemini" | "aider" | "generic" | undefined;
}

export interface DeveloperAgentOutput {
  implementationPrompt: string;
}

const IMPLEMENTATION_PROMPT_TEMPLATE = `# Implementation Prompt

## Goal

Implement the feature described in the requirement below based on the provided design, tasks, and test matrix.

## Context

**Requirement**: {{requirement}}

**Clarified Requirement**: {{clarifiedRequirement}}

**Technical Design**: {{technicalDesign}}

**API Design**: {{apiDesign}}

**Database Design**: {{dbDesign}}

**Coding Plan**: {{codingPlanMd}}

## Requirements

1. Implement according to the clarified requirement and acceptance criteria.
2. Follow the technical design and API design specifications.
3. Implement all tasks from the task breakdown.
4. Ensure all test cases from the test matrix pass.
5. Follow the coding plan implementation order and file specifications.

## Acceptance Criteria

{{acceptanceCriteria}}

## Tasks

{{taskBreakdownMd}}

## Test Expectations

{{testMatrixMd}}

## Constraints

- Do not modify files outside the scope of this task.
- Follow existing code conventions and patterns.
- Do not introduce new dependencies unless specified.
- Ensure all existing tests continue to pass.
- Do not expose sensitive information.
- Add or update tests for all changes.
- Keep changes minimal and focused on the requirement.

## Expected Output

Modified or new files implementing the feature according to the design and tasks above.
`;

const FALLBACK_TEMPLATE = IMPLEMENTATION_PROMPT_TEMPLATE;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "developer-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

export async function runDeveloperAgent(
  input: DeveloperAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<DeveloperAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATE;

  if (options?.aiTool) {
    const result = await runAgent({
      role: "DEVELOPER",
      promptTemplate: template,
      context: {
        rawRequirement: input.requirement,
        clarifiedRequirement: input.clarifiedRequirement,
        businessRules: input.businessRules,
        acceptanceCriteria: input.acceptanceCriteria,
        technicalDesign: input.technicalDesign,
        apiDesign: input.apiDesign,
        dbDesign: input.dbDesign,
        taskBreakdown: input.taskBreakdownMd,
        testMatrix: input.testMatrixMd,
        codingPlan: input.codingPlanMd,
      },
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return { implementationPrompt: result.output };
    }
  }

  const context = {
    requirement: input.requirement,
    clarifiedRequirement: input.clarifiedRequirement,
    businessRules: input.businessRules,
    acceptanceCriteria: input.acceptanceCriteria,
    technicalDesign: input.technicalDesign,
    apiDesign: input.apiDesign,
    dbDesign: input.dbDesign,
    taskBreakdownMd: input.taskBreakdownMd,
    testMatrixMd: input.testMatrixMd,
    codingPlanMd: input.codingPlanMd,
  };

  return {
    implementationPrompt: renderPrompt(IMPLEMENTATION_PROMPT_TEMPLATE, context),
  };
}
