import type { ReactElement } from "react";

const AGENT_LABELS: Record<string, string> = {
  BA: "BA Agent",
  PRODUCT_OWNER: "PO Agent",
  ARCHITECT: "Architect Agent",
  PROJECT_MANAGER: "PM Agent",
  QA: "QA Agent",
  REPORTER: "Reporter Agent",
  UX_RESEARCHER: "UX Researcher",
  UI_DESIGNER: "UI Designer",
  UX_WRITER: "UX Writer",
  FRONTEND_PLANNER: "Frontend Planner",
  BACKEND_PLANNER: "Backend Planner",
  DEVELOPER: "Developer Agent",
  CODE_REVIEWER: "Code Reviewer",
  SECURITY_REVIEWER: "Security Reviewer",
  CODING_PLANNER: "Coding Planner",
  INTEGRATION_PLANNER: "Integration Planner",
  DEVOPS_RELEASE: "DevOps Release",
  TRACEABILITY: "Traceability Agent",
  TECHNICAL_DOC: "Technical Documentation",
};

const AGENT_ACTIVITIES: Record<string, string> = {
  BA: "analyzing requirements...",
  PRODUCT_OWNER: "defining scope...",
  ARCHITECT: "designing architecture...",
  PROJECT_MANAGER: "breaking down tasks...",
  QA: "planning tests...",
  REPORTER: "generating report...",
  UX_RESEARCHER: "researching user needs...",
  UI_DESIGNER: "designing UI...",
  UX_WRITER: "writing UX copy...",
  FRONTEND_PLANNER: "planning frontend...",
  BACKEND_PLANNER: "planning backend...",
  DEVELOPER: "implementing code...",
  CODE_REVIEWER: "reviewing code...",
  SECURITY_REVIEWER: "reviewing security...",
  CODING_PLANNER: "planning implementation...",
  INTEGRATION_PLANNER: "planning integrations...",
  DEVOPS_RELEASE: "planning release...",
  TRACEABILITY: "generating traceability...",
  TECHNICAL_DOC: "writing documentation...",
};

interface AgentActivityIndicatorProps {
  agentRole: string | null;
  stage?: string;
  completedStages?: number;
  totalStages?: number;
}

export function AgentActivityIndicator({
  agentRole,
  stage,
  completedStages,
  totalStages,
}: AgentActivityIndicatorProps): ReactElement | null {
  if (!agentRole) return null;

  const agentLabel = AGENT_LABELS[agentRole] ?? `${agentRole} Agent`;
  const activity = AGENT_ACTIVITIES[agentRole] ?? "working...";

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900">
            {agentLabel}
            <span className="font-normal text-blue-700 ml-1">{activity}</span>
          </p>
          {stage && <p className="text-xs text-blue-600 mt-0.5 truncate">{stage}</p>}
        </div>
        {completedStages !== undefined && totalStages !== undefined && totalStages > 0 && (
          <span className="text-xs text-blue-600 shrink-0">
            {completedStages}/{totalStages}
          </span>
        )}
      </div>
    </div>
  );
}
