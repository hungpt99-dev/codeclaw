export type WorkflowStepKind =
  | "clarification"
  | "requirements"
  | "ui_ux"
  | "architecture"
  | "frontend_plan"
  | "backend_plan"
  | "api_data"
  | "tasks"
  | "implementation_prompt"
  | "coding_execution"
  | "testing"
  | "review"
  | "release_plan"
  | "documentation"
  | "final_report"
  | "custom";

export interface WorkflowStepDefinition {
  id: string;
  name: string;
  agentName?: string;
  enabled: boolean;
  requiresApproval?: boolean;
  producesArtifacts?: boolean;
  description?: string;
  order: number;
  kind?: WorkflowStepKind;
}

export interface WorkflowTemplate {
  workflowTemplateId: string;
  projectId?: string;
  name: string;
  description?: string;
  steps: WorkflowStepDefinition[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalRuns: number;
  running: number;
  completed: number;
  failed: number;
  waitingApproval: number;
  latestRun: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
  } | null;
}
