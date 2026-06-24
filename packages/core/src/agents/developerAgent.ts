import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@codeclaw/adapters";
import type { AiCliTool } from "@codeclaw/adapters";
import type { AgentBackendConfig } from "@codeclaw/shared";
import { runWithAgentBackend } from "./agentBackendRunner.js";

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
    agentBackendConfig?: AgentBackendConfig | undefined;
  },
): Promise<DeveloperAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATE;

  if (options?.agentBackendConfig) {
    const agentPrompt = `You are a senior software engineer. Create an implementation prompt for the following feature.

Requirement: ${input.requirement}
Clarified Requirement: ${input.clarifiedRequirement}
Business Rules: ${input.businessRules}
Acceptance Criteria: ${input.acceptanceCriteria}
Technical Design: ${input.technicalDesign}
API Design: ${input.apiDesign}
Database Design: ${input.dbDesign}
Task Breakdown: ${input.taskBreakdownMd}
Test Matrix: ${input.testMatrixMd}
Coding Plan: ${input.codingPlanMd}

Generate a comprehensive implementation prompt that includes:
1. Goal - what to implement
2. Context - requirements, design, coding plan
3. Requirements - what to build
4. Acceptance Criteria
5. Tasks to complete
6. Test Expectations
7. Constraints and conventions`;

    const result = await runWithAgentBackend({
      config: options.agentBackendConfig,
      agentId: "DEVELOPER",
      agentName: "Developer",
      systemPrompt:
        "You are a senior software engineer. Create comprehensive implementation prompts that guide AI coding agents to implement features correctly.",
      userPrompt: agentPrompt,
      context: { requirement: input.requirement },
      outputFormat: "markdown",
    });

    if (result?.content) {
      return { implementationPrompt: result.content };
    }
  }

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
