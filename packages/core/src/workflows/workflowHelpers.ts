import type { AiCliTool } from "@aiteam/adapters";
import type { ProjectType } from "@aiteam/shared";

export type PlannerSelection = "frontend" | "backend" | "both" | "auto";

type AgentRoleKey =
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
  | "TECHNICAL_DOC";

const AGENT_TO_CONFIG_KEY: Record<string, string> = {
  BA: "defaultBa",
  PRODUCT_OWNER: "defaultPo",
  ARCHITECT: "defaultArchitect",
  PROJECT_MANAGER: "defaultPm",
  QA: "defaultQa",
  DEVELOPER: "defaultDeveloper",
  REPORTER: "defaultReporter",
  UX_RESEARCHER: "defaultUxResearcher",
  UI_DESIGNER: "defaultUiDesigner",
  UX_WRITER: "defaultUxWriter",
  FRONTEND_PLANNER: "defaultFrontendPlanner",
  BACKEND_PLANNER: "defaultBackendPlanner",
  INTEGRATION_PLANNER: "defaultIntegrationPlanner",
  DEVOPS_RELEASE: "defaultDevopsRelease",
  TECHNICAL_DOC: "defaultTechnicalDoc",
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

export function detectPlannerSelection(
  projectType: ProjectType | null | undefined,
): PlannerSelection {
  switch (projectType) {
    case "react-vite":
      return "frontend";
    case "java-spring-boot":
    case "node-nestjs":
    case "node-express":
      return "backend";
    default:
      return "both";
  }
}

export function resolvePlannerSelection(
  selection: PlannerSelection | undefined,
  projectType: ProjectType | null | undefined,
): { runFrontend: boolean; runBackend: boolean } {
  const effective = selection ?? "auto";
  if (effective === "frontend") return { runFrontend: true, runBackend: false };
  if (effective === "backend") return { runFrontend: false, runBackend: true };
  if (effective === "both") return { runFrontend: true, runBackend: true };
  const detected = detectPlannerSelection(projectType);
  if (detected === "frontend") return { runFrontend: true, runBackend: false };
  if (detected === "backend") return { runFrontend: false, runBackend: true };
  return { runFrontend: true, runBackend: true };
}
