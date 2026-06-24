import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@aiteam/adapters";
import type { AiCliTool } from "@aiteam/adapters";
import { parseUiDesignerOutput } from "./parsers/uiDesignerOutputParser.js";

export interface UiDesignerAgentInput {
  requirement: string;
  clarifiedRequirement: string;
  userPersonas: string;
  userFlows: string;
}

export interface UiDesignerAgentOutput {
  screenDescriptions: string;
  componentTree: string;
  states: string;
}

const SCREEN_DESCRIPTIONS_TEMPLATE = `# Screen Descriptions

## Screens for: {{requirement}}

### Main Screen
- **Purpose**: Primary interface for the feature
- **Layout**: Centered content area with header, body, and footer sections
- **Key Elements**: Title, input fields, primary action button, status indicator

### Confirmation Screen
- **Purpose**: Display result or confirmation after action
- **Layout**: Single-card layout with result details
- **Key Elements**: Success/error icon, message text, action buttons
`;

const COMPONENT_TREE_TEMPLATE = `# Component Tree

## Components for: {{requirement}}

### Main Screen
\`\`\`
[MainScreen]
├── Header
│   ├── Title
│   └── BackButton
├── Body
│   ├── InputForm
│   │   ├── TextField
│   │   ├── SelectField
│   │   └── SubmitButton
│   └── StatusIndicator
│       ├── Spinner
│       └── StatusText
└── Footer
    └── HelpLink
\`\`\`

### Confirmation Screen
\`\`\`
[ConfirmationScreen]
├── ResultCard
│   ├── StatusIcon
│   ├── MessageTitle
│   └── MessageBody
└── ActionButtons
    ├── PrimaryAction
    └── SecondaryAction
\`\`\`
`;

const STATES_TEMPLATE = `# States

## States for: {{requirement}}

### Main Screen
- **Empty State**: Clean form with placeholder text in all fields. "No data yet" message if applicable.
- **Loading State**: Spinner overlay on the form area. All buttons disabled. "Processing..." text.
- **Error State**: Inline error messages below relevant fields. Form-level error banner at top.
- **Edge Cases**: Long input text truncation, rapid double-submit prevention, network timeout handling.

### Confirmation Screen
- **Empty State**: Not applicable (always shows result).
- **Loading State**: Skeleton card with pulsing placeholders.
- **Error State**: Red error icon with "Something went wrong" and retry button.
- **Edge Cases**: Result too long to display, partial success scenarios.
`;

const FALLBACK_TEMPLATES = `${SCREEN_DESCRIPTIONS_TEMPLATE}\n\n${COMPONENT_TREE_TEMPLATE}\n\n${STATES_TEMPLATE}`;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "ui-designer-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

export async function runUiDesignerAgent(
  input: UiDesignerAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<UiDesignerAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATES;

  if (options?.aiTool) {
    const result = await runAgent({
      role: "UI_DESIGNER",
      promptTemplate: template,
      context: {
        requirement: input.requirement,
        clarifiedRequirement: input.clarifiedRequirement,
        userPersonas: input.userPersonas,
        userFlows: input.userFlows,
      },
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parseUiDesignerOutput(result.output, input.requirement);
    }
  }

  const context = { requirement: input.requirement };

  return {
    screenDescriptions: renderPrompt(SCREEN_DESCRIPTIONS_TEMPLATE, context),
    componentTree: renderPrompt(COMPONENT_TREE_TEMPLATE, context),
    states: renderPrompt(STATES_TEMPLATE, context),
  };
}
