import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@aiteam/adapters";
import type { AiCliTool } from "@aiteam/adapters";
import { parsePmOutput } from "./parsers/pmOutputParser.js";
import { generateJiraReadyMarkdown } from "../integrations/jiraMarkdownGenerator.js";

export interface PmAgentInput {
  requirement: string;
  technicalDesign: string;
  acceptanceCriteria?: string;
}

export interface PmAgentOutput {
  taskBreakdownMd: string;
  taskBreakdownJson: string;
  jiraReadyMd?: string | undefined;
}

const TASK_BREAKDOWN_TEMPLATE = `# Task Breakdown

## Tasks for: {{requirement}}

### Epic: Implement Core Requirement

#### Phase 1: Foundation
| Task ID | Title | Estimate | Priority | Dependencies |
|---------|-------|----------|----------|--------------|
| T-001 | Set up project structure and configuration | 2h | High | None |
| T-002 | Define core types and interfaces | 3h | High | T-001 |
| T-003 | Implement input validation layer | 4h | High | T-002 |

#### Phase 2: Core Logic
| Task ID | Title | Estimate | Priority | Dependencies |
|---------|-------|----------|----------|--------------|
| T-004 | Implement main processing service | 8h | High | T-003 |
| T-005 | Implement error handling middleware | 4h | Medium | T-004 |
| T-006 | Implement logging and monitoring | 3h | Medium | T-004 |

#### Phase 3: Integration
| Task ID | Title | Estimate | Priority | Dependencies |
|---------|-------|----------|----------|--------------|
| T-007 | Implement API endpoints | 6h | High | T-004 |
| T-008 | Implement database layer | 6h | High | T-002 |
| T-009 | Wire up end-to-end flow | 4h | High | T-007, T-008 |

#### Phase 4: Quality
| Task ID | Title | Estimate | Priority | Dependencies |
|---------|-------|----------|----------|--------------|
| T-010 | Write unit tests | 6h | High | T-004 |
| T-011 | Write integration tests | 4h | High | T-009 |
| T-012 | Performance testing and optimization | 4h | Medium | T-009 |
| T-013 | Documentation | 3h | Medium | T-009 |

### Summary
- **Total Tasks**: 13
- **Total Estimated Hours**: 57h
- **Critical Path**: T-001 → T-002 → T-003 → T-004 → T-007 → T-009 → T-011
`;

const FALLBACK_TEMPLATES = TASK_BREAKDOWN_TEMPLATE;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "pm-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

export async function runPmAgent(
  input: PmAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<PmAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATES;

  if (options?.aiTool) {
    const result = await runAgent({
      role: "PROJECT_MANAGER",
      promptTemplate: template,
      context: {
        requirement: input.requirement,
        technicalDesign: input.technicalDesign,
      },
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parsePmOutput(result.output, input.requirement);
    }
  }

  const context = { requirement: input.requirement };

  const taskBreakdownMd = renderPrompt(TASK_BREAKDOWN_TEMPLATE, context);

  const taskBreakdownJson = JSON.stringify(
    {
      epic: "Implement Core Requirement",
      requirement: input.requirement,
      phases: [
        {
          name: "Foundation",
          tasks: [
            {
              id: "T-001",
              title: "Set up project structure and configuration",
              estimate: "2h",
              priority: "High",
              dependencies: [],
            },
            {
              id: "T-002",
              title: "Define core types and interfaces",
              estimate: "3h",
              priority: "High",
              dependencies: ["T-001"],
            },
            {
              id: "T-003",
              title: "Implement input validation layer",
              estimate: "4h",
              priority: "High",
              dependencies: ["T-002"],
            },
          ],
        },
        {
          name: "Core Logic",
          tasks: [
            {
              id: "T-004",
              title: "Implement main processing service",
              estimate: "8h",
              priority: "High",
              dependencies: ["T-003"],
            },
            {
              id: "T-005",
              title: "Implement error handling middleware",
              estimate: "4h",
              priority: "Medium",
              dependencies: ["T-004"],
            },
            {
              id: "T-006",
              title: "Implement logging and monitoring",
              estimate: "3h",
              priority: "Medium",
              dependencies: ["T-004"],
            },
          ],
        },
        {
          name: "Integration",
          tasks: [
            {
              id: "T-007",
              title: "Implement API endpoints",
              estimate: "6h",
              priority: "High",
              dependencies: ["T-004"],
            },
            {
              id: "T-008",
              title: "Implement database layer",
              estimate: "6h",
              priority: "High",
              dependencies: ["T-002"],
            },
            {
              id: "T-009",
              title: "Wire up end-to-end flow",
              estimate: "4h",
              priority: "High",
              dependencies: ["T-007", "T-008"],
            },
          ],
        },
        {
          name: "Quality",
          tasks: [
            {
              id: "T-010",
              title: "Write unit tests",
              estimate: "6h",
              priority: "High",
              dependencies: ["T-004"],
            },
            {
              id: "T-011",
              title: "Write integration tests",
              estimate: "4h",
              priority: "High",
              dependencies: ["T-009"],
            },
            {
              id: "T-012",
              title: "Performance testing and optimization",
              estimate: "4h",
              priority: "Medium",
              dependencies: ["T-009"],
            },
            {
              id: "T-013",
              title: "Documentation",
              estimate: "3h",
              priority: "Medium",
              dependencies: ["T-009"],
            },
          ],
        },
      ],
      totalTasks: 13,
      totalEstimatedHours: 57,
      criticalPath: ["T-001", "T-002", "T-003", "T-004", "T-007", "T-009", "T-011"],
    },
    null,
    2,
  );

  const jiraReadyMd = input.acceptanceCriteria
    ? generateJiraReadyMarkdown({
        title: `Implement: ${input.requirement.slice(0, 80)}`,
        requirementSummary: input.requirement,
        taskBreakdown: taskBreakdownMd,
        acceptanceCriteria: input.acceptanceCriteria,
        technicalDesign: input.technicalDesign,
      })
    : undefined;

  return { taskBreakdownMd, taskBreakdownJson, jiraReadyMd };
}
