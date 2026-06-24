export type WorkflowProgressEventType =
  | "WORKFLOW_STARTED"
  | "WORKFLOW_COMPLETED"
  | "STAGE_STARTED"
  | "STAGE_COMPLETED"
  | "AGENT_STARTED"
  | "AGENT_COMPLETED"
  | "ARTIFACT_GENERATED"
  | "ERROR";

export const WorkflowProgressEventTypeValues: Record<
  WorkflowProgressEventType,
  WorkflowProgressEventType
> = {
  WORKFLOW_STARTED: "WORKFLOW_STARTED",
  WORKFLOW_COMPLETED: "WORKFLOW_COMPLETED",
  STAGE_STARTED: "STAGE_STARTED",
  STAGE_COMPLETED: "STAGE_COMPLETED",
  AGENT_STARTED: "AGENT_STARTED",
  AGENT_COMPLETED: "AGENT_COMPLETED",
  ARTIFACT_GENERATED: "ARTIFACT_GENERATED",
  ERROR: "ERROR",
};

export interface WorkflowProgressEvent {
  runId: string;
  type: WorkflowProgressEventType;
  stage?: string;
  agentRole?: string;
  artifactType?: string;
  artifactPath?: string;
  message: string;
  timestamp: string;
  status?: string;
  stages?: string[];
}
