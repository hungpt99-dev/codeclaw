import { runAgentPrompt } from "./agentPromptRunner.js";

export type AiCliTool = "claude" | "codex" | "gemini" | "aider" | "opencode";

export type AgentRole =
  | "BA"
  | "PRODUCT_OWNER"
  | "PROJECT_MANAGER"
  | "ARCHITECT"
  | "DEVELOPER"
  | "QA"
  | "CODE_REVIEWER"
  | "SECURITY_REVIEWER"
  | "REPORTER"
  | "UX_RESEARCHER"
  | "UI_DESIGNER"
  | "UX_WRITER"
  | "FRONTEND_PLANNER"
  | "BACKEND_PLANNER"
  | "INTEGRATION_PLANNER"
  | "DEVOPS_RELEASE"
  | "TECHNICAL_DOCUMENTATION"
  | "TRACEABILITY"
  | "CODING_PLANNER";

export interface AgentRunInput {
  role: AgentRole;
  promptTemplate: string;
  context: Record<string, string>;
  aiToolConfig?: {
    tool: AiCliTool;
    command: string;
    timeoutSeconds: number;
  };
}

export interface AgentRunResult {
  success: boolean;
  output: string;
  usedAi: boolean;
  error?: string | undefined;
}

export function renderPrompt(template: string, context: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return context[key] ?? `{{${key}}}`;
  });
}

export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
  const rendered = renderPrompt(input.promptTemplate, input.context);

  if (input.aiToolConfig) {
    const result = await runAgentPrompt(rendered, {
      command: input.aiToolConfig.command,
      timeoutSeconds: input.aiToolConfig.timeoutSeconds,
    });

    if (result.success) {
      return {
        success: true,
        output: result.output,
        usedAi: true,
      };
    }

    return {
      success: true,
      output: rendered,
      usedAi: false,
      error: result.error,
    };
  }

  return {
    success: true,
    output: rendered,
    usedAi: false,
  };
}
