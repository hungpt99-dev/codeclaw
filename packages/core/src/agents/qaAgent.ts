import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@codeclaw/adapters";
import type { AiCliTool } from "@codeclaw/adapters";
import { parseQaOutput } from "./parsers/qaOutputParser.js";

export interface QaAgentInput {
  requirement: string;
  acceptanceCriteria: string;
  taskBreakdownJson: string;
}

export interface QaAgentOutput {
  testMatrixMd: string;
  testMatrixJson: string;
}

const TEST_MATRIX_TEMPLATE = `# Test Matrix

## Test Plan for: {{requirement}}

### Test Strategy
This document defines the testing approach for verifying the requirement.

### Unit Tests
| ID | Test Case | Component | Input | Expected Output | Priority |
|----|-----------|-----------|-------|-----------------|----------|
| UT-001 | Valid input produces expected output | Main Service | Valid payload | Success response | High |
| UT-002 | Invalid input returns validation error | Validator | Invalid payload | Validation error | High |
| UT-003 | Empty input returns appropriate error | Validator | Empty payload | Empty input error | Medium |
| UT-004 | Null input returns appropriate error | Validator | null | Null input error | Medium |
| UT-005 | Maximum size input handled correctly | Main Service | Max size payload | Success response | Medium |
| UT-006 | Concurrent requests handled correctly | Main Service | Multiple requests | All succeed or fail gracefully | High |

### Integration Tests
| ID | Test Case | Components | Scenario | Expected Outcome | Priority |
|----|-----------|------------|----------|------------------|----------|
| IT-001 | End-to-end happy path | All layers | Valid input through full stack | Correct result returned | High |
| IT-002 | Database failure handled | Service + DB | DB connection lost | Graceful error response | High |
| IT-003 | API contract validation | API + Service | Request/response format | Matches API spec | High |
| IT-004 | Concurrent access consistency | Service + DB | Parallel writes | Data consistency maintained | Medium |

### Edge Cases
| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-001 | Very long input strings | Truncated or rejected with clear message |
| EC-002 | Special characters in input | Properly escaped and handled |
| EC-003 | Unicode / multi-byte characters | Correctly processed |
| EC-004 | Rapid successive requests | Rate limited or queued appropriately |
| EC-005 | System restart during processing | Idempotent recovery |

### Non-Functional Tests
| ID | Type | Target | Measurement |
|----|------|--------|-------------|
| NFT-001 | Performance | Response time < 2s | Load test with 100 concurrent users |
| NFT-002 | Reliability | 99.9% uptime | Soak test over 24 hours |
| NFT-003 | Load | Handle 1000 req/min | Gradual ramp-up test |
`;

const FALLBACK_TEMPLATES = TEST_MATRIX_TEMPLATE;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "qa-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

export async function runQaAgent(
  input: QaAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<QaAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATES;

  if (options?.aiTool) {
    const result = await runAgent({
      role: "QA",
      promptTemplate: template,
      context: {
        requirement: input.requirement,
        acceptanceCriteria: input.acceptanceCriteria,
        taskBreakdown: input.taskBreakdownJson,
      },
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parseQaOutput(result.output, input.requirement);
    }
  }

  const context = { requirement: input.requirement };

  const testMatrixMd = renderPrompt(TEST_MATRIX_TEMPLATE, context);

  const testMatrixJson = JSON.stringify(
    {
      requirement: input.requirement,
      unitTests: [
        {
          id: "UT-001",
          testCase: "Valid input produces expected output",
          component: "Main Service",
          input: "Valid payload",
          expectedOutput: "Success response",
          priority: "High",
        },
        {
          id: "UT-002",
          testCase: "Invalid input returns validation error",
          component: "Validator",
          input: "Invalid payload",
          expectedOutput: "Validation error",
          priority: "High",
        },
        {
          id: "UT-003",
          testCase: "Empty input returns appropriate error",
          component: "Validator",
          input: "Empty payload",
          expectedOutput: "Empty input error",
          priority: "Medium",
        },
        {
          id: "UT-004",
          testCase: "Null input returns appropriate error",
          component: "Validator",
          input: "null",
          expectedOutput: "Null input error",
          priority: "Medium",
        },
        {
          id: "UT-005",
          testCase: "Maximum size input handled correctly",
          component: "Main Service",
          input: "Max size payload",
          expectedOutput: "Success response",
          priority: "Medium",
        },
        {
          id: "UT-006",
          testCase: "Concurrent requests handled correctly",
          component: "Main Service",
          input: "Multiple requests",
          expectedOutput: "All succeed or fail gracefully",
          priority: "High",
        },
      ],
      integrationTests: [
        {
          id: "IT-001",
          testCase: "End-to-end happy path",
          components: "All layers",
          scenario: "Valid input through full stack",
          expectedOutcome: "Correct result returned",
          priority: "High",
        },
        {
          id: "IT-002",
          testCase: "Database failure handled",
          components: "Service + DB",
          scenario: "DB connection lost",
          expectedOutcome: "Graceful error response",
          priority: "High",
        },
        {
          id: "IT-003",
          testCase: "API contract validation",
          components: "API + Service",
          scenario: "Request/response format",
          expectedOutcome: "Matches API spec",
          priority: "High",
        },
        {
          id: "IT-004",
          testCase: "Concurrent access consistency",
          components: "Service + DB",
          scenario: "Parallel writes",
          expectedOutcome: "Data consistency maintained",
          priority: "Medium",
        },
      ],
      edgeCases: [
        {
          id: "EC-001",
          scenario: "Very long input strings",
          expectedBehavior: "Truncated or rejected with clear message",
        },
        {
          id: "EC-002",
          scenario: "Special characters in input",
          expectedBehavior: "Properly escaped and handled",
        },
        {
          id: "EC-003",
          scenario: "Unicode / multi-byte characters",
          expectedBehavior: "Correctly processed",
        },
        {
          id: "EC-004",
          scenario: "Rapid successive requests",
          expectedBehavior: "Rate limited or queued appropriately",
        },
        {
          id: "EC-005",
          scenario: "System restart during processing",
          expectedBehavior: "Idempotent recovery",
        },
      ],
      nonFunctionalTests: [
        {
          id: "NFT-001",
          type: "Performance",
          target: "Response time < 2s",
          measurement: "Load test with 100 concurrent users",
        },
        {
          id: "NFT-002",
          type: "Reliability",
          target: "99.9% uptime",
          measurement: "Soak test over 24 hours",
        },
        {
          id: "NFT-003",
          type: "Load",
          target: "Handle 1000 req/min",
          measurement: "Gradual ramp-up test",
        },
      ],
    },
    null,
    2,
  );

  return { testMatrixMd, testMatrixJson };
}
