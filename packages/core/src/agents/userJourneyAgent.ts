import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@codeclaw/adapters";
import type { AiCliTool } from "@codeclaw/adapters";
import { parseUserJourneyOutput } from "./parsers/userJourneyOutputParser.js";

export interface UserJourneyAgentInput {
  requirement: string;
  clarifiedRequirement: string;
  acceptanceCriteria: string;
  scopeDefinition: string;
}

export interface UserJourneyAgentOutput {
  userPersonas: string;
  userFlows: string;
  journeyMap: string;
}

const USER_PERSONAS_TEMPLATE = `# User Personas

## Personas for: {{requirement}}

### Primary Persona
| Attribute | Description |
|-----------|-------------|
| Name | Primary User |
| Role | End user of the system |
| Goal | Complete the primary task efficiently |
| Pain Points | Complexity, unclear steps, slow response |
| Technical Level | Intermediate |

### Secondary Persona
| Attribute | Description |
|-----------|-------------|
| Name | Administrator |
| Role | System administrator / power user |
| Goal | Configure, monitor, and maintain the system |
| Pain Points | Lack of visibility, manual configuration |
| Technical Level | Advanced |
`;

const USER_FLOWS_TEMPLATE = `# User Flows

## Flows for: {{requirement}}

### Main Flow
1. User navigates to the feature entry point.
2. System presents the initial state (input form / landing view).
3. User provides required information.
4. System validates the input.
5. System processes the request.
6. System presents the result or confirmation.
7. User reviews the output.

### Error Flow
1. User provides invalid input.
2. System detects validation error.
3. System displays inline error message.
4. User corrects the input.
5. Flow continues from step 4 of main flow.

### Empty State Flow
1. User navigates to the feature with no existing data.
2. System displays empty state with guidance.
3. User initiates the first action.
4. System processes the action.
`;

const JOURNEY_MAP_TEMPLATE = `# Journey Map

## Journey for: {{requirement}}

| Phase | User Action | Touchpoint | Emotion | Pain Point | Opportunity |
|-------|-------------|------------|---------|------------|-------------|
| Discovery | Learns about the feature | App UI / Docs | Curious | Unclear where to start | Provide clear entry point |
| Onboarding | First interaction | Feature screen | Uncertain | Complex initial view | Guided walkthrough |
| Usage | Completes primary task | Main interface | Focused | Too many steps | Streamline workflow |
| Completion | Views result | Result screen | Satisfied | Confirmation unclear | Clear success feedback |
| Error | Encounters an issue | Error state | Frustrated | Vague error message | Actionable error copy |
`;

const FALLBACK_TEMPLATES = `${USER_PERSONAS_TEMPLATE}\n\n${USER_FLOWS_TEMPLATE}\n\n${JOURNEY_MAP_TEMPLATE}`;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "user-journey-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

export async function runUserJourneyAgent(
  input: UserJourneyAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<UserJourneyAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATES;

  if (options?.aiTool) {
    const result = await runAgent({
      role: "UX_RESEARCHER",
      promptTemplate: template,
      context: {
        requirement: input.requirement,
        clarifiedRequirement: input.clarifiedRequirement,
        acceptanceCriteria: input.acceptanceCriteria,
        scopeDefinition: input.scopeDefinition,
      },
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parseUserJourneyOutput(result.output, input.requirement);
    }
  }

  const context = { requirement: input.requirement };

  return {
    userPersonas: renderPrompt(USER_PERSONAS_TEMPLATE, context),
    userFlows: renderPrompt(USER_FLOWS_TEMPLATE, context),
    journeyMap: renderPrompt(JOURNEY_MAP_TEMPLATE, context),
  };
}
