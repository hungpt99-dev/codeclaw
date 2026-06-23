export type {
  RunMode,
  RunStatus,
  ArtifactType,
  Run,
  Artifact,
  AiTeamConfig,
  AiCliTool,
  AgentRole as AgentRoleName,
  AiCliToolConfig,
  ApprovalGate,
  ApprovalStatus,
  Approval,
  AiAdapterName,
  AiAdapterConfig,
  AiTaskInput,
  AiTaskResult,
} from "./types/domain.js";
export {
  RunMode as RunModeValues,
  RunStatus as RunStatusValues,
  ArtifactType as ArtifactTypeValues,
} from "./types/domain.js";

export { configSchema, defaultConfig } from "./schemas/config.schema.js";
export type { Config, SlackNotifyEvent } from "./schemas/config.schema.js";

export { runSchema } from "./schemas/run.schema.js";
export type { RunSchema } from "./schemas/run.schema.js";

export { createRunId, slugify } from "./utils/ids.js";
export { nowIso } from "./utils/date.js";
export type {
  ProjectType,
  RepositoryAnalysis,
  CoverageStatus,
  TraceabilityItem,
  TraceabilityMatrix,
  GitHubIntegrationConfig,
  JiraIntegrationConfig,
  SlackIntegrationConfig,
  TestStatus,
  TestCommandResult,
} from "./types/domain.js";
export { MemoryScope, MemoryFormat, AgentRole } from "./types/memory.js";
export type {
  MemoryScope as MemoryScopeType,
  MemoryFormat as MemoryFormatType,
  MemoryItem,
  AgentRole as AgentRoleType,
  RuntimeMemoryContext,
} from "./types/memory.js";
