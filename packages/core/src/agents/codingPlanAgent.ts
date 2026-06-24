import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@codeclaw/adapters";
import type { AiCliTool } from "@codeclaw/adapters";
import type { AgentBackendConfig } from "@codeclaw/shared";
import { runWithAgentBackend } from "./agentBackendRunner.js";
import { parseCodingPlanOutput } from "./parsers/codingPlanOutputParser.js";

export interface CodingPlanAgentInput {
  requirement: string;
  clarifiedRequirement: string;
  businessRules: string;
  acceptanceCriteria: string;
  technicalDesign: string;
  apiDesign: string;
  dbDesign: string;
  taskBreakdownMd: string;
  testMatrixMd: string;
  targetAgent?: "claude-code" | "codex" | "gemini" | "aider" | "generic" | undefined;
}

export interface CodingPlanAgentOutput {
  codingPlanMd: string;
}

const CODING_PLAN_TEMPLATE = `# Coding Plan

You are an expert software engineer planning the implementation of a feature. Create a detailed coding plan.

## Input

**Requirement**: {{requirement}}

**Clarified Requirement**: {{clarifiedRequirement}}

**Technical Design**: {{technicalDesign}}

**API Design**: {{apiDesign}}

**Database Design**: {{dbDesign}}

## Task Breakdown

{{taskBreakdownMd}}

## Test Matrix

{{testMatrixMd}}

## Instructions

Create a detailed coding plan for implementing this feature. Structure your response with the following sections:

### Files to Create
List each file to create with its purpose and key contents.

### Files to Modify
List each existing file to modify with specific changes.

### Implementation Order
List the order in which files should be implemented, with dependencies noted.

### Patterns and Conventions
Note any coding patterns, conventions, or architectural patterns to follow.

### Risks and Challenges
Identify potential risks, edge cases, or challenges.

### Testing Strategy
How to verify each change.

## Constraints
- Do not recommend modifying protected files (.env, credentials.json, etc.)
- Follow existing code conventions.
- Keep changes minimal and focused.
- Consider testability in the implementation order.
- Do not introduce new dependencies unless specified.
- Ensure all existing tests continue to pass.
`;

const FALLBACK_TEMPLATE = CODING_PLAN_TEMPLATE;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "coding-plan-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

export async function runCodingPlanAgent(
  input: CodingPlanAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
    agentBackendConfig?: AgentBackendConfig | undefined;
  },
): Promise<CodingPlanAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATE;

  if (options?.agentBackendConfig) {
    const agentPrompt = `You are a senior software engineer. Create a detailed coding plan for implementing the following feature.

Requirement: ${input.requirement}
Clarified Requirement: ${input.clarifiedRequirement}
Technical Design: ${input.technicalDesign}
API Design: ${input.apiDesign}
Database Design: ${input.dbDesign}
Task Breakdown: ${input.taskBreakdownMd}
Test Matrix: ${input.testMatrixMd}

Generate the following sections:
1. Files to Create
2. Files to Modify
3. Implementation Order
4. Patterns and Conventions
5. Risks and Challenges
6. Testing Strategy`;

    const result = await runWithAgentBackend({
      config: options.agentBackendConfig,
      agentId: "CODING_PLANNER",
      agentName: "Coding Planner",
      systemPrompt:
        "You are a senior software engineer. Create detailed coding plans that guide implementation.",
      userPrompt: agentPrompt,
      context: { requirement: input.requirement },
      outputFormat: "markdown",
    });

    if (result?.content) {
      return parseCodingPlanOutput(result.content);
    }
  }

  if (options?.aiTool) {
    const result = await runAgent({
      role: "CODING_PLANNER",
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
      },
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parseCodingPlanOutput(result.output);
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
  };

  return {
    codingPlanMd: renderPrompt(CODING_PLAN_TEMPLATE, context),
  };
}
