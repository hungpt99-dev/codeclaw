import type { AiCliTool } from "@aiteam/adapters";

type AgentRoleKey =
  | "BA"
  | "PRODUCT_OWNER"
  | "PROJECT_MANAGER"
  | "ARCHITECT"
  | "DEVELOPER"
  | "QA"
  | "CODE_REVIEWER"
  | "SECURITY_REVIEWER"
  | "REPORTER";

const AGENT_TO_CONFIG_KEY: Record<string, string> = {
  BA: "defaultBa",
  ARCHITECT: "defaultArchitect",
  PROJECT_MANAGER: "defaultPm",
  QA: "defaultQa",
  DEVELOPER: "defaultDeveloper",
  REPORTER: "defaultReporter",
};

export interface AiToolConfig {
  tool: AiCliTool;
  command: string;
  timeoutSeconds: number;
}

export function getAiToolConfig(
  role: AgentRoleKey,
  agentMapping: Record<string, string>,
  cliConfigs: Record<string, { enabled: boolean; command: string; timeoutSeconds: number }>,
): AiToolConfig | undefined {
  const configKey = AGENT_TO_CONFIG_KEY[role];
  if (!configKey) return undefined;

  const toolName = agentMapping[configKey] as AiCliTool | undefined;
  if (!toolName) return undefined;

  const cliConfig = cliConfigs[toolName];
  if (!cliConfig?.enabled) return undefined;

  return {
    tool: toolName,
    command: cliConfig.command,
    timeoutSeconds: cliConfig.timeoutSeconds,
  };
}
