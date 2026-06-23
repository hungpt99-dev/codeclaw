import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@aiteam/adapters";
import type { AiCliTool } from "@aiteam/adapters";
import { parsePoOutput } from "./parsers/poOutputParser.js";

export interface PoAgentInput {
  clarifiedRequirement: string;
  acceptanceCriteria: string;
  openQuestions: string;
  assumptions: string;
}

export interface PoAgentOutput {
  productGoal: string;
  mvpScope: string;
  outOfScope: string;
  successCriteria: string;
}

const PRODUCT_GOAL_TEMPLATE = `# Product Goal

## Goal for: {{clarifiedRequirement}}

### Vision
This delivery aims to fulfill the requirement described above.

### Objectives
- Deliver the core functionality as specified in the acceptance criteria.
- Ensure the solution meets the stated quality and performance expectations.
- Provide a foundation that can be extended in future iterations.

### Success Definition
The product goal is achieved when all acceptance criteria are met and the delivered solution satisfies the clarified requirement.
`;

const MVP_SCOPE_TEMPLATE = `# MVP Scope

## In Scope for: {{clarifiedRequirement}}

### Core Features
| Feature | Priority | Description |
|---------|----------|-------------|
| Core Implementation | High | Implement the primary functionality described in the requirement |
| Input Validation | High | Validate all inputs against defined rules |
| Error Handling | High | Gracefully handle error states with user feedback |
| Testing | High | Unit and integration tests for core functionality |

### Deliverables
- Working implementation of the core feature set
- Automated tests covering acceptance criteria
- Documentation for usage and maintenance
`;

const OUT_OF_SCOPE_TEMPLATE = `# Out of Scope

## Not in Scope for: {{clarifiedRequirement}}

### Future Considerations
- Advanced features beyond the core requirement
- Performance optimization beyond standard thresholds
- Integration with external systems not explicitly listed
- Multi-region or multi-language support
- Advanced analytics or reporting dashboards

### Exclusions
1. Features not explicitly mentioned in the acceptance criteria
2. Non-functional enhancements beyond standard requirements
3. Third-party service integrations not specified in the requirement
`;

const SUCCESS_CRITERIA_TEMPLATE = `# Success Criteria

## Criteria for: {{clarifiedRequirement}}

### Functional Success
- All acceptance criteria (AC-001 through AC-005) pass
- Core functionality works as described in the clarified requirement
- Edge cases are handled appropriately

### Quality Success
- Test coverage meets or exceeds 80%
- No critical or high-severity bugs
- Response time under 2 seconds for typical operations

### Delivery Success
- Implementation is complete and deployable
- Documentation is sufficient for ongoing maintenance
- Stakeholder review confirms alignment with requirements
`;

const FALLBACK_TEMPLATES = `${PRODUCT_GOAL_TEMPLATE}\n\n${MVP_SCOPE_TEMPLATE}\n\n${OUT_OF_SCOPE_TEMPLATE}\n\n${SUCCESS_CRITERIA_TEMPLATE}`;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "po-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

export async function runPoAgent(
  input: PoAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<PoAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATES;

  if (options?.aiTool) {
    const result = await runAgent({
      role: "PRODUCT_OWNER",
      promptTemplate: template,
      context: {
        clarifiedRequirement: input.clarifiedRequirement,
        acceptanceCriteria: input.acceptanceCriteria,
        openQuestions: input.openQuestions,
        assumptions: input.assumptions,
      },
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parsePoOutput(result.output);
    }
  }

  const context = { clarifiedRequirement: input.clarifiedRequirement };

  return {
    productGoal: renderPrompt(PRODUCT_GOAL_TEMPLATE, context),
    mvpScope: renderPrompt(MVP_SCOPE_TEMPLATE, context),
    outOfScope: renderPrompt(OUT_OF_SCOPE_TEMPLATE, context),
    successCriteria: renderPrompt(SUCCESS_CRITERIA_TEMPLATE, context),
  };
}
