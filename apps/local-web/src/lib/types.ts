export interface Run {
  id: string;
  title: string;
  rawRequirement: string;
  mode: string;
  outputLanguage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalSteps?: number;
  completedSteps?: number;
  failedSteps?: number;
  skippedSteps?: number;
}

export interface Artifact {
  id: string;
  runId: string;
  type: string;
  name: string;
  path: string;
  format: string;
  createdAt: string;
  content?: string;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface PromptFile {
  name: string;
  path: string;
}

export interface PromptDetail {
  name: string;
  content: string;
}

export interface Approval {
  id: string;
  runId: string;
  gate: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TraceabilityItem {
  requirementId: string;
  requirementText: string;
  acceptanceCriteriaIds: string[];
  taskIds: string[];
  codeFiles: string[];
  testCases: string[];
  testResults: string[];
  status: "COVERED" | "PARTIAL" | "NOT_COVERED" | "UNKNOWN";
}

export interface TraceabilityMatrix {
  runId: string;
  items: TraceabilityItem[];
  generatedAt: string;
  summary: {
    total: number;
    covered: number;
    partial: number;
    notCovered: number;
  };
}

export interface TestCommandResult {
  name: string;
  command: string;
  exitCode: number | null;
  status: string;
  durationMs: number;
  stdoutPath: string;
  stderrPath: string;
}

export interface TestRunResult {
  overallStatus: string;
  results: TestCommandResult[];
}

export interface CodeGenerationResult {
  success: boolean;
  changedFiles: string[];
  diffPatchPath: string;
  agentLogPath: string;
  fileSafety?: {
    blocked: string[];
    warnings: string[];
    safe: string[];
  };
}

export interface GitHubStatus {
  ghCliAvailable: boolean;
  ghAuthenticated: boolean;
  ghVersion: string | null;
  currentRepo: { owner: string; repo: string } | null;
  configValid: boolean;
  overall: string;
}

export interface GitHubPRSummary {
  title: string;
  body: string;
}

export interface GitHubPRInfo {
  state: string;
  title: string;
  url: string;
  number: number;
}

export interface GitHubCIRun {
  workflow: string;
  status: string;
  conclusion: string;
}

export interface JiraStatus {
  configured: boolean;
  enabled: boolean;
  hasToken: boolean;
  siteUrl?: string;
  projectKey?: string;
  overall: string;
}

export interface JiraTestResult {
  success: boolean;
  message: string;
  accountId?: string;
  displayName?: string;
}

export interface SlackStatus {
  configured: boolean;
  enabled: boolean;
  hasToken: boolean;
  channelId?: string;
  overall: string;
}

export interface SlackTestResult {
  success: boolean;
  message: string;
  team?: string;
  user?: string;
}

export interface SlackPostResult {
  success: boolean;
  ts?: string | undefined;
  error?: string | undefined;
}

export type ExportFormat =
  | "markdown"
  | "html"
  | "docx"
  | "pdf"
  | "zip"
  | "combined-md"
  | "json"
  | "all";

export interface ExportOptions {
  format: ExportFormat;
  includeLogs?: boolean;
  includeDiff?: boolean;
  title?: string;
  author?: string;
}

export interface ReviewOutput {
  overallStatus: "APPROVED" | "APPROVED_WITH_WARNINGS" | "CHANGES_REQUIRED";
  reviewReportPath?: string;
  securityReviewPath?: string;
  requirementCoveragePath?: string;
}

export interface ReviewArtifacts {
  reviewReport: string;
  securityReview: string;
  requirementCoverage: string;
}

export interface FixLoopIteration {
  iteration: number;
  fixPrompt: string;
  gitDiff: string;
  passed: boolean;
  testResult: TestRunResult;
  reviewResult: ReviewOutput;
}

export interface FixLoopResult {
  iterations: FixLoopIteration[];
  finalStatus: "PASSED" | "FAILED" | "MAX_ITERATIONS_REACHED";
  totalDurationMs: number;
}

export interface ExportResult {
  success: boolean;
  outputPath: string;
  format: string;
  fileSize: number;
  error?: string;
}

export interface AiCliToolInfo {
  name: string;
  key: string;
  command: string;
  enabled: boolean;
  available: boolean;
  status: "available" | "missing" | "disabled";
}

export interface AiCliStatusResponse {
  tools: AiCliToolInfo[];
}

export interface AiCliTestResult {
  success: boolean;
  message: string;
}

export interface StorageInfo {
  aiTeamPath: string;
  databasePath: string;
  runsPath: string;
  promptsPath: string;
  logsPath: string;
  totalRuns: number;
  totalSizeBytes: number;
}

export interface StorageCleanResult {
  success: boolean;
  message: string;
  freedBytes: number;
}

export interface WorkflowProgressEvent {
  runId: string;
  type: string;
  stage?: string;
  agentRole?: string;
  artifactType?: string;
  artifactPath?: string;
  message: string;
  timestamp: string;
  status?: string;
  stages?: string[];
}

export type StepStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";

export interface StepRun {
  id: string;
  runId: string;
  stepIndex: number;
  stepName: string;
  agentRole: string | null;
  status: StepStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  outputArtifactPath: string | null;
}

export interface WorkflowStepDefinition {
  id: string;
  name: string;
  agentName?: string;
  enabled: boolean;
  requiresApproval?: boolean;
  producesArtifacts?: boolean;
  description?: string;
}

export interface WorkflowTemplate {
  workflowTemplateId: string;
  name: string;
  description?: string;
  steps: WorkflowStepDefinition[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileChangeSummary {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "unknown";
  additions?: number;
  deletions?: number;
  isBinary?: boolean;
  isLarge?: boolean;
  isRisky?: boolean;
}

export interface ProviderConfig {
  provider: string;
  model: string | null;
  baseUrl: string | null;
  apiKeyEnv: string | null;
  timeoutMs: number | null;
}

export interface NativeRunnerStatus {
  available: boolean;
  version: string | null;
}

export interface ProjectEntry {
  id: string;
  name: string;
  rootPath: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  exists: boolean;
}

export type DocArtifactType =
  | "clarified_requirement"
  | "business_rules"
  | "acceptance_criteria"
  | "open_questions"
  | "scope_definition"
  | "technical_design"
  | "api_design"
  | "database_design"
  | "task_breakdown"
  | "test_matrix"
  | "implementation_prompt"
  | "review_report"
  | "security_review"
  | "traceability_matrix"
  | "final_report"
  | "user_journey"
  | "ux_design"
  | "ux_copy"
  | "component_breakdown";

export const DOC_ARTIFACT_LABELS: Record<DocArtifactType, string> = {
  clarified_requirement: "Clarified Requirement",
  business_rules: "Business Rules",
  acceptance_criteria: "Acceptance Criteria",
  open_questions: "Open Questions / Assumptions",
  scope_definition: "Scope Definition",
  technical_design: "Technical Design",
  api_design: "API Design",
  database_design: "Database Design",
  task_breakdown: "Task Breakdown",
  test_matrix: "Test Matrix",
  implementation_prompt: "Implementation Prompt",
  review_report: "Review Report",
  security_review: "Security Review",
  traceability_matrix: "Traceability Matrix",
  final_report: "Final Report",
  user_journey: "User Journey",
  ux_design: "UX Design",
  ux_copy: "UX Copy",
  component_breakdown: "Component Breakdown",
};
