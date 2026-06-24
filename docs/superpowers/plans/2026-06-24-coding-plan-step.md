# Coding Plan Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a formal Implementation Coding Plan stage between task breakdown/test matrix and code execution that generates a structured `coding-plan.md` artifact.

**Architecture:** Follow existing agent/parser/workflow pattern: create a CodingPlanAgent with input interface, output interface, inline template, optional external template loader, and output parser. Add paths to ArtifactWriter, insert the step in semi-auto and assisted workflows, and update the DeveloperAgent to reference the coding plan. Add a new ApprovalGate for optional user review.

**Tech Stack:** TypeScript, existing @codeclaw/core agent patterns, mustache-style templates

---

### Task 1: Add new types to shared domain

**Files:**

- Modify: `packages/shared/src/types/domain.ts`

- [ ] **Step 1: Add CODING_PLANNER to AgentRole**

```typescript
// In AgentRole type union, add:
  | "CODING_PLANNER"
```

- [ ] **Step 2: Add CODING_PLAN to ArtifactType**

```typescript
// In ArtifactType const, add:
  CODING_PLAN: "CODING_PLAN",
```

- [ ] **Step 3: Add WAITING_FOR_CODING_PLAN_APPROVAL to RunStatus**

```typescript
// In RunStatus const, add:
  WAITING_FOR_CODING_PLAN_APPROVAL: "WAITING_FOR_CODING_PLAN_APPROVAL",
```

- [ ] **Step 4: Add CODING_PLAN to ApprovalGate**

```typescript
// In ApprovalGate type union, add:
  | "CODING_PLAN"
```

### Task 2: Add coding plan paths to artifact writer

**Files:**

- Modify: `packages/core/src/artifacts/artifactWriter.ts`

- [ ] **Step 1: Add codingPlanDir and codingPlanPath to ArtifactPaths**

```typescript
codingPlanDir: string;
codingPlanPath: string;
```

- [ ] **Step 2: Add paths in getArtifactPaths**

```typescript
    codingPlanDir: join(runDir, "coding-plan"),
    codingPlanPath: join(runDir, "coding-plan", "coding-plan.md"),
```

- [ ] **Step 3: Add mkdir call in createArtifactDirs**

```typescript
await mkdir(paths.codingPlanDir, { recursive: true });
```

### Task 3: Create coding plan output parser

**Files:**

- Create: `packages/core/src/agents/parsers/codingPlanOutputParser.ts`

- [ ] **Step 1: Write the parser**

```typescript
interface CodingPlanParsedOutput {
  codingPlanMd: string;
}

function extractSection(raw: string, heading: string): string {
  const regex = new RegExp(
    `(?:^|\\n)##?\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n##?\\s|$)`,
    "i",
  );
  const match = raw.match(regex);
  return match?.[1]?.trim() ?? "";
}

export function parseCodingPlanOutput(raw: string): CodingPlanParsedOutput {
  const plan = extractSection(raw, "Coding Plan") || raw;
  return { codingPlanMd: `# Coding Plan\n\n${plan}` };
}
```

### Task 4: Create coding plan agent

**Files:**

- Create: `packages/core/src/agents/codingPlanAgent.ts`

- [ ] **Step 1: Write the agent following existing patterns**

```typescript
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@codeclaw/adapters";
import type { AiCliTool } from "@codeclaw/adapters";
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

const CODING_PLAN_TEMPLATE = `# Coding Plan Agent Prompt

You are an expert software engineer planning the implementation of a feature.

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

## Coding Plan

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
- Follow existing code conventions
- Keep changes minimal and focused
- Consider testability in the implementation order
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
  },
): Promise<CodingPlanAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATE;

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
```

### Task 5: Add coding plan prompt template

**Files:**

- Create: `templates/prompts/coding-plan-agent.md`

- [ ] **Step 1: Write the template file** (same content as CODING_PLAN_TEMPLATE constant but with `{{variable}}` syntax)

### Task 6: Update developer agent to reference coding plan

**Files:**

- Modify: `packages/core/src/agents/developerAgent.ts`

- [ ] **Step 1: Add codingPlanMd to DeveloperAgentInput**

```typescript
export interface DeveloperAgentInput {
  // ... existing fields ...
  codingPlanMd: string;
}
```

- [ ] **Step 2: Add codingPlan to the template**

```
**Coding Plan**: {{codingPlanMd}}
```

- [ ] **Step 3: Add "6. Follow the coding plan implementation order" to Requirements**

- [ ] **Step 4: Add codingPlanMd to context mappings**

### Task 7: Update semi-auto workflow

**Files:**

- Modify: `packages/core/src/workflows/semiAutoWorkflow.ts`

- [ ] **Step 1: Import runCodingPlanAgent**
- [ ] **Step 2: Add codingPlanTool config**
- [ ] **Step 3: After QA output and before Developer Agent, run Coding Plan Agent**
- [ ] **Step 4: Write coding-plan.md artifact**
- [ ] **Step 5: Pass codingPlanMd to Developer Agent input**
- [ ] **Step 6: Include coding-plan.md in code approval gate artifacts**
- [ ] **Step 7: Update continueAfterRiskyFileApproval to read codingPlanMd**
- [ ] **Step 8: Update continueSemiAutoWorkflow references**

### Task 8: Update assisted workflow

**Files:**

- Modify: `packages/core/src/workflows/assistedWorkflow.ts`

- [ ] **Step 1: Import runCodingPlanAgent**
- [ ] **Step 2: Add codingPlanTool config**
- [ ] **Step 3: After QA and before UX agents or Developer Agent, run Coding Plan Agent**
- [ ] **Step 4: Pass codingPlanMd to Developer Agent input**

### Task 9: Update core exports

**Files:**

- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add export for runCodingPlanAgent and types**

### Task 10: Update CLI and server gate registrations

**Files:**

- Modify: `apps/cli/src/commands/approve.ts`
- Modify: `apps/cli/src/commands/reject.ts`
- Modify: `apps/cli/src/commands/resume.ts`
- Modify: `apps/cli/src/commands/run.ts`
- Modify: `packages/server/src/routes/runs.routes.ts`

- [ ] **Step 1: Add "CODING_PLAN" to all validGates arrays**
- [ ] **Step 2: Add "coding-plan" to inferArtifactType in run.ts**

### Task 11: Add tests

**Files:**

- Create/modify: `packages/core/src/agents/__tests__/codingPlanAgent.test.ts`
- Or modify existing test file

- [ ] **Step 1: Write test for coding plan agent**

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-24-coding-plan-step.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
