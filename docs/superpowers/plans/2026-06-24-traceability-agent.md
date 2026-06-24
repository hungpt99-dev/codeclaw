# Traceability Agent Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the deterministic traceability engine into a dedicated Traceability Agent with dual-mode (AI + deterministic), coverage analysis narrative, gap detection, after-code traceability, and independent CLI triggering.

**Architecture:** Follow the existing agent pattern (`baAgent.ts`/`codeReviewerAgent.ts`): an input interface, an output interface, an inline fallback template, a `loadTemplate()` that reads from `templates/prompts/traceability-agent.md`, and a `runTraceabilityAgent()` function that tries AI mode first (with parser) then falls back to deterministic mode. The deterministic mode refactors and wraps the existing `traceabilityEngine.ts`.

**Tech Stack:** TypeScript, Vitest, the existing `@aiteam/adapters` (`runAgent`/`renderPrompt`), the existing `@aiteam/shared` types (`TraceabilityMatrix`, `TraceabilityItem`, `CoverageStatus`).

---

### Task 1: Add `TRACEABILITY` role to AgentRole type

**Files:**

- Modify: `packages/adapters/src/ai/agentRunner.ts:14`

- [ ] **Step 1: Add TRACEABILITY to the union type**

Add `"TRACEABILITY"` to the `AgentRole` union type:

```typescript
  | "INTEGRATION_PLANNER"
  | "DEVOPS_RELEASE"
  | "TECHNICAL_DOCUMENTATION"
+ | "TRACEABILITY";
```

---

### Task 2: Refactor traceabilityEngine to export helpers and accept optional paths for after-code

**Files:**

- Modify: `packages/core/src/traceability/traceabilityEngine.ts`
- Modify: `packages/core/src/traceability/traceabilityEngine.test.ts`

- [ ] **Step 1: Export `determineStatus` function**

Add export to the existing `determineStatus` function at line 21:

```typescript
export function determineStatus(item: { taskIds: string[]; testCases: string[] }): CoverageStatus {
```

- [ ] **Step 2: Add `changedFilesPath` parameter for after-code traceability**

Modify `generateTraceability` to accept an optional `changedFilesPath` parameter. When provided, read JSON file at that path, extract file paths, and map them to requirement items.

```typescript
export async function generateTraceability(
  runId: string,
  artifactPaths: ArtifactPaths,
  changedFilesPath?: string,
): Promise<TraceabilityMatrix> {
  // ... existing code ...

  // After-code: read changed files and add to codeFiles
  let changedFiles: string[] = [];
  if (changedFilesPath) {
    try {
      const changedFilesContent = await readFile(changedFilesPath, "utf-8");
      const parsed = JSON.parse(changedFilesContent);
      changedFiles = Array.isArray(parsed) ? parsed : parsed.files ?? [];
    } catch {
      // silently ignore
    }
  }

  // In items, assign codeFiles:
  // if changedFiles.length > 0, add them to the item.codeFiles
```

Then in item creation, if changedFiles exist, add them:

```typescript
codeFiles: changedFiles,
```

- [ ] **Step 3: Run existing tests to confirm backward compatibility**

```bash
pnpm --filter @aiteam/core test --traceabilityEngine
```

---

### Task 3: Create traceability output parser

**Files:**

- Create: `packages/core/src/agents/parsers/traceabilityOutputParser.ts`

- [ ] **Step 1: Create the parser**

```typescript
import type { CoverageStatus } from "@aiteam/shared";

export interface TraceabilityAgentOutput {
  coverageAnalysis: string;
  gapDetection: string;
  recommendations: string;
}

function extractSection(raw: string, heading: string): string {
  const regex = new RegExp(
    `(?:^|\\n)##?\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n##?\\s|$)`,
    "i",
  );
  const match = raw.match(regex);
  return match?.[1]?.trim() ?? "";
}

export function parseTraceabilityOutput(raw: string): TraceabilityAgentOutput {
  return {
    coverageAnalysis: extractSection(raw, "Coverage Analysis") || "No coverage analysis provided.",
    gapDetection: extractSection(raw, "Gap Detection") || "No gap detection provided.",
    recommendations: extractSection(raw, "Recommendations") || "No recommendations provided.",
  };
}
```

---

### Task 4: Create traceability agent prompt template

**Files:**

- Create: `templates/prompts/traceability-agent.md`

- [ ] **Step 1: Create the prompt template**

```markdown
You are a Traceability Agent. Your job is to analyze the traceability matrix and produce a detailed report.

## Current Traceability Matrix

{{traceabilityMatrix}}

## Changed Code Files

{{changedFiles}}

## Task

1. **Coverage Analysis**: For each requirement, explain why it has its current coverage status (COVERED, PARTIAL, NOT_COVERED, UNKNOWN). Note which acceptance criteria have corresponding tasks and tests, and which are missing.

2. **Gap Detection**: Identify specific gaps:
   - Requirements without any task coverage
   - Requirements without any test coverage
   - Acceptance criteria without test cases
   - Code files that exist but are not linked to any requirement

3. **Recommendations**: Suggest actionable next steps:
   - Additional tests needed for partial coverage
   - Tasks that should be created for uncovered requirements
   - Risks introduced by coverage gaps

Output format:

## Coverage Analysis

...

## Gap Detection

...

## Recommendations

...
```

---

### Task 5: Create the Traceability Agent

**Files:**

- Create: `packages/core/src/agents/traceabilityAgent.ts`

- [ ] **Step 1: Create the agent file**

Following the exact same pattern as `codeReviewerAgent.ts` (dual-mode agent with AI enhancement):

```typescript
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
import type { TraceabilityMatrix, CoverageStatus } from "@aiteam/shared";

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

// AI-enhanced template for fallback
const TRACEABILITY_ANALYSIS_TEMPLATE = `## Coverage Analysis

{{coverageAnalysis}}

## Gap Detection

{{gapDetection}}

## Recommendations

{{recommendations}}
`;

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
        ` (Tasks: ${item.taskIds.length}, Tests: ${item.testCases.length}, Code Files: ${item.codeFiles.length})`,
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
    if (partial > 0)
      parts.push(
        `${partial} requirement(s) have partial coverage — they may have tasks but lack tests, or vice versa.`,
      );
    if (notCovered > 0)
      parts.push(
        `${notCovered} requirement(s) have no coverage at all — they need both tasks and tests.`,
      );
  }
  return parts.join(" ");
}

function buildGapNarrative(matrix: TraceabilityMatrix): string {
  const noTasks = matrix.items.filter((i) => i.taskIds.length === 0);
  const noTests = matrix.items.filter((i) => i.testCases.length === 0);
  const parts: string[] = [];
  if (noTasks.length > 0) {
    parts.push(
      `${noTasks.length} requirement(s) have no task breakdown: ${noTasks.map((i) => i.requirementId).join(", ")}.`,
    );
  }
  if (noTests.length > 0) {
    parts.push(
      `${noTests.length} requirement(s) have no test coverage: ${noTests.map((i) => i.requirementId).join(", ")}.`,
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
      `- Create tasks and tests for the ${notCovered} uncovered requirement(s) to improve coverage.`,
    );
  }
  const partial = matrix.items.filter((i) => i.status === "PARTIAL");
  if (partial.length > 0) {
    lines.push(
      `- Complete coverage for ${partial.length} partially covered requirement(s) by adding missing tests or tasks.`,
    );
  }
  const noCodeFiles = matrix.items.filter((i) => i.codeFiles.length === 0);
  if (noCodeFiles.length > 0) {
    lines.push(
      `- Map code files to ${noCodeFiles.length} requirement(s) that have no code files linked.`,
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
  // Step 1: Generate the base matrix (always deterministic)
  const matrix =
    input.existingMatrix ??
    (await generateTraceability(input.runId, input.artifactPaths, input.changedFilesPath));

  const markdown = traceabilityToMarkdown(matrix);

  // Step 2: Try AI enhancement
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

  // Step 3: Deterministic fallback
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
```

---

### Task 6: Add `traceabilitySection` variable to reporter template

**Files:**

- Check: `templates/prompts/reporter-agent.md` — already has `{{traceabilitySection}}` in template
- Modify: `packages/core/src/agents/reporterAgent.ts`

The reporter template already includes `{{traceabilitySection}}` and the agent passes it through. The reporter workflow already includes the traceability section. No changes needed to the reporter agent — it already injects the traceabilitySection as-is.

---

### Task 7: Update workflows to use Traceability Agent

**Files:**

- Modify: `packages/core/src/workflows/docsOnlyWorkflow.ts`
- Modify: `packages/core/src/workflows/assistedWorkflow.ts`
- Modify: `packages/core/src/workflows/semiAutoWorkflow.ts`

- [ ] **Step 1: Update docsOnlyWorkflow.ts**

Replace the direct `generateTraceability` usage with `runTraceabilityAgent`:

```typescript
// At top:
import {
  runTraceabilityAgent,
  traceabilityToEnhancedMarkdown,
} from "../agents/traceabilityAgent.js";

// Replace lines 476-483:
const traceabilityOutput = await runTraceabilityAgent(
  {
    runId,
    artifactPaths: paths,
  },
  { templateDir, aiTool: aiToolConfig },
);

const traceabilityMd = traceabilityToEnhancedMarkdown(traceabilityOutput);
await writeArtifact(paths.traceabilityMd, traceabilityMd);
artifacts.push(paths.traceabilityMd);

await writeArtifact(paths.traceabilityJson, JSON.stringify(traceabilityOutput.matrix, null, 2));
artifacts.push(paths.traceabilityJson);

const traceabilitySection = traceabilityMd;
```

- [ ] **Step 2: Apply similar updates to assistedWorkflow.ts and semiAutoWorkflow.ts**

Same pattern: call `runTraceabilityAgent` instead of `generateTraceability`, write enhanced markdown, pass to reporter.

---

### Task 8: Update CLI `aiteam trace` to support AI mode

**Files:**

- Modify: `apps/cli/src/index.ts` (add `--ai` option)
- Modify: `apps/cli/src/commands/trace.ts` (use traceability agent)

- [ ] **Step 1: Add `--ai` flag to CLI command**

```typescript
program
  .command("trace")
  .description("Generate or show traceability matrix for a run")
  .requiredOption("--run <runId>", "Run ID")
  .option("--format <format>", "Output format: markdown, json, all", "all")
  .option("--regenerate", "Regenerate traceability from artifacts")
  .option("--ai", "Use AI enhancement for coverage analysis and recommendations")
  .action(async (options: { run: string; format?: string; regenerate?: boolean; ai?: boolean }) => {
    await traceCommand(options);
  });
```

- [ ] **Step 2: Update traceCommand to use agent when --ai is set**

```typescript
import { runTraceabilityAgent, traceabilityToEnhancedMarkdown } from "@aiteam/core";

// In the --regenerate block, when --ai is specified:
if (options.regenerate) {
  if (options.ai) {
    const { getAiToolConfig } = await import("@aiteam/core");
    const aiToolConfig = getAiToolConfig();
    const aiTool = aiToolConfig
      ? {
          tool: aiToolConfig.tool as any,
          command: aiToolConfig.command,
          timeoutSeconds: aiToolConfig.timeoutSeconds,
        }
      : undefined;

    // Try to load template dir
    const templateDir = join(aiTeamDir, "templates", "prompts");

    const output = await runTraceabilityAgent(
      { runId, artifactPaths: paths },
      { templateDir, aiTool: aiTool ?? undefined },
    );

    await writeFile(paths.traceabilityMd, traceabilityToEnhancedMarkdown(output));
    await writeFile(paths.traceabilityJson, JSON.stringify(output.matrix, null, 2));

    // Store items in DB (same as before)
    // ...
  } else {
    // Existing deterministic path
    const matrix = await generateTraceability(runId, paths);
    // ... existing code
  }
}
```

- [ ] **Step 3: Export `runTraceabilityAgent` and `traceabilityToEnhancedMarkdown` from `@aiteam/core`**

```typescript
// In packages/core/src/index.ts:
export {
  runTraceabilityAgent,
  traceabilityToEnhancedMarkdown,
} from "./agents/traceabilityAgent.js";
export type {
  TraceabilityAgentInput,
  TraceabilityAgentOutput,
} from "./agents/traceabilityAgent.js";
```

---

### Task 9: Update index.ts exports in core

**Files:**

- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add traceability agent exports**

```typescript
export {
  runTraceabilityAgent,
  traceabilityToEnhancedMarkdown,
} from "./agents/traceabilityAgent.js";
export type {
  TraceabilityAgentInput,
  TraceabilityAgentOutput,
} from "./agents/traceabilityAgent.js";
export { parseTraceabilityOutput } from "./agents/parsers/traceabilityOutputParser.js";
export type { TraceabilityMatrix, TraceabilityItem, CoverageStatus } from "@aiteam/shared";
```

---

### Task 10: Add tests

**Files:**

- Create: `packages/core/src/agents/traceabilityAgent.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect } from "vitest";
import { runTraceabilityAgent, traceabilityToEnhancedMarkdown } from "./traceabilityAgent.js";
import type { TraceabilityMatrix } from "@aiteam/shared";

const mockMatrix: TraceabilityMatrix = {
  runId: "test-run",
  items: [
    {
      requirementId: "REQ-001",
      requirementText: "User login",
      acceptanceCriteriaIds: ["AC-001", "AC-002"],
      taskIds: ["TASK-001", "TASK-002"],
      codeFiles: ["src/login.ts"],
      testCases: ["TC-001"],
      testResults: [],
      status: "COVERED",
    },
    {
      requirementId: "REQ-002",
      requirementText: "Password reset",
      acceptanceCriteriaIds: ["AC-003"],
      taskIds: [],
      codeFiles: [],
      testCases: [],
      testResults: [],
      status: "NOT_COVERED",
    },
  ],
  generatedAt: new Date().toISOString(),
  summary: { total: 2, covered: 1, partial: 0, notCovered: 1 },
};

describe("runTraceabilityAgent (deterministic fallback)", () => {
  it("returns structured output without AI tool", async () => {
    const result = await runTraceabilityAgent({
      runId: "test-run",
      artifactPaths: {} as any,
      existingMatrix: mockMatrix,
    });

    expect(result).toHaveProperty("matrix");
    expect(result).toHaveProperty("markdown");
    expect(result).toHaveProperty("coverageAnalysis");
    expect(result).toHaveProperty("gapDetection");
    expect(result).toHaveProperty("recommendations");
  });

  it("generates coverage analysis with correct numbers", async () => {
    const result = await runTraceabilityAgent({
      runId: "test-run",
      artifactPaths: {} as any,
      existingMatrix: mockMatrix,
    });

    expect(result.coverageAnalysis).toContain("50%");
    expect(result.coverageAnalysis).toContain("REQ-001");
    expect(result.coverageAnalysis).toContain("REQ-002");
  });

  it("detects gaps in coverage", async () => {
    const result = await runTraceabilityAgent({
      runId: "test-run",
      artifactPaths: {} as any,
      existingMatrix: mockMatrix,
    });

    expect(result.gapDetection).toContain("REQ-002");
    expect(result.gapDetection).toContain("no task");
    expect(result.gapDetection).toContain("no test");
  });

  it("generates actionable recommendations", async () => {
    const result = await runTraceabilityAgent({
      runId: "test-run",
      artifactPaths: {} as any,
      existingMatrix: mockMatrix,
    });

    expect(result.recommendations).toContain("REQ-002");
  });
});

describe("traceabilityToEnhancedMarkdown", () => {
  it("combines matrix and analysis into single markdown", async () => {
    const result = await runTraceabilityAgent({
      runId: "test-run",
      artifactPaths: {} as any,
      existingMatrix: mockMatrix,
    });

    const md = traceabilityToEnhancedMarkdown(result);
    expect(md).toContain("# Traceability Matrix");
    expect(md).toContain("## Coverage Analysis");
    expect(md).toContain("## Gap Detection");
    expect(md).toContain("## Recommendations");
    expect(md).toContain("REQ-001");
    expect(md).toContain("REQ-002");
  });
});
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @aiteam/core test
```

---

### Task 11: Run verification

- [ ] **Step 1: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 2: Build**

```bash
pnpm build
```

- [ ] **Step 3: Run all tests**

```bash
pnpm test
```
