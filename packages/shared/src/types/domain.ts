export const RunMode = {
  "docs-only": "docs-only",
  assisted: "assisted",
  "semi-auto": "semi-auto",
  "multi-agent": "multi-agent",
} as const;

export type RunMode = (typeof RunMode)[keyof typeof RunMode];

export const RunStatus = {
  CREATED: "CREATED",
  SPEC_GENERATED: "SPEC_GENERATED",
  WAITING_FOR_REQUIREMENT_APPROVAL: "WAITING_FOR_REQUIREMENT_APPROVAL",
  PLAN_GENERATED: "PLAN_GENERATED",
  WAITING_FOR_PLAN_APPROVAL: "WAITING_FOR_PLAN_APPROVAL",
  WAITING_FOR_CODE_APPROVAL: "WAITING_FOR_CODE_APPROVAL",
  CODING: "CODING",
  CODE_GENERATED: "CODE_GENERATED",
  CODE_FAILED: "CODE_FAILED",
  TESTING: "TESTING",
  TEST_PASSED: "TEST_PASSED",
  TEST_FAILED: "TEST_FAILED",
  TEST_SKIPPED: "TEST_SKIPPED",
  REPORT_GENERATED: "REPORT_GENERATED",
  REVIEW_PASSED: "REVIEW_PASSED",
  REVIEW_FAILED: "REVIEW_FAILED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

export type ApprovalGate =
  | "REQUIREMENT"
  | "PLAN"
  | "CODE_GENERATION"
  | "RISKY_FILE"
  | "EXTERNAL_UPDATE"
  | "ROLLBACK";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Approval {
  gate: ApprovalGate;
  runId: string;
  status: ApprovalStatus;
  approvedAt?: string;
  approvedBy?: string;
  note?: string;
}

export const ArtifactType = {
  RAW_REQUIREMENT: "RAW_REQUIREMENT",
  CLARIFIED_REQUIREMENT: "CLARIFIED_REQUIREMENT",
  BUSINESS_RULES: "BUSINESS_RULES",
  ACCEPTANCE_CRITERIA: "ACCEPTANCE_CRITERIA",
  OPEN_QUESTIONS: "OPEN_QUESTIONS",
  ASSUMPTIONS: "ASSUMPTIONS",
  TECHNICAL_DESIGN: "TECHNICAL_DESIGN",
  API_DESIGN: "API_DESIGN",
  DB_DESIGN: "DB_DESIGN",
  TASK_BREAKDOWN: "TASK_BREAKDOWN",
  JIRA_READY_TASKS: "JIRA_READY_TASKS",
  TEST_MATRIX: "TEST_MATRIX",
  IMPLEMENTATION_PROMPT: "IMPLEMENTATION_PROMPT",
  AGENT_LOG: "AGENT_LOG",
  DIFF_PATCH: "DIFF_PATCH",
  CHANGED_FILES: "CHANGED_FILES",
  TEST_RESULT: "TEST_RESULT",
  FAILED_TESTS: "FAILED_TESTS",
  FINAL_REPORT: "FINAL_REPORT",
} as const;

export type ArtifactType = (typeof ArtifactType)[keyof typeof ArtifactType];

export interface Run {
  id: string;
  requirement: string;
  mode: RunMode;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  runId: string;
  type: ArtifactType;
  content: string;
  createdAt: string;
}

export type AiCliTool = "claude" | "codex" | "gemini" | "aider";

export type TestStatus = "PASSED" | "FAILED" | "TIMEOUT" | "SKIPPED" | "NOT_RUN";

export interface TestCommandResult {
  name: string;
  command: string;
  exitCode: number | null;
  status: TestStatus;
  durationMs: number;
  stdoutPath: string;
  stderrPath: string;
}

export type AiAdapterName = AiCliTool;

export interface AiAdapterConfig {
  enabled: boolean;
  command: string;
  timeoutSeconds: number;
}

export interface AiTaskInput {
  role: AgentRole;
  prompt: string;
  workingDir: string;
  contextFiles?: string[];
  outputLogPath: string;
  timeoutSeconds: number;
}

export interface AiTaskResult {
  success: boolean;
  exitCode: number | null;
  outputLogPath: string;
  changedFiles: string[];
  error?: string;
}

export type AgentRole =
  | "BA"
  | "PRODUCT_OWNER"
  | "PROJECT_MANAGER"
  | "ARCHITECT"
  | "DEVELOPER"
  | "QA"
  | "CODE_REVIEWER"
  | "SECURITY_REVIEWER"
  | "REPORTER";

export interface AiCliToolConfig {
  enabled: boolean;
  command: string;
  timeoutSeconds: number;
}

export type ProjectType =
  | "java-spring-boot"
  | "node-nestjs"
  | "react-vite"
  | "node-express"
  | "generic";

export interface RepositoryAnalysis {
  projectType: ProjectType | null;
  language: string | null;
  framework: string | null;
  buildTool: string | null;
  testFramework: string | null;
  migrationTool: string | null;
  sourceDirs: string[];
  testDirs: string[];
  configFiles: string[];
  detectedPatterns: string[];
  packageManager: string | null;
  nodeVersion: string | null;
  javaVersion: string | null;
}

export type CoverageStatus = "COVERED" | "PARTIAL" | "NOT_COVERED" | "UNKNOWN";

export interface TraceabilityItem {
  requirementId: string;
  requirementText: string;
  acceptanceCriteriaIds: string[];
  taskIds: string[];
  codeFiles: string[];
  testCases: string[];
  testResults: string[];
  status: CoverageStatus;
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

export interface GitHubIntegrationConfig {
  enabled: boolean;
  mode: "gh-cli";
  owner?: string;
  repo?: string;
}

export interface JiraIntegrationConfig {
  enabled: boolean;
  siteUrl?: string;
  email?: string;
  projectKey?: string;
  defaultIssueType: "epic" | "story" | "task" | "subtask";
  tokenEnvRef: string;
}

export interface SlackIntegrationConfig {
  enabled: boolean;
  channelId?: string;
  tokenEnvRef: string;
  notifyOn: (
    | "docs_generated"
    | "code_generated"
    | "test_passed"
    | "test_failed"
    | "report_ready"
  )[];
}

export interface AiTeamConfig {
  version: string;
  project: {
    name: string;
    type: string;
    language: string;
    framework: string;
    workingDir: string;
  };
  agents: {
    defaultBa: AiCliTool;
    defaultArchitect: AiCliTool;
    defaultPm: AiCliTool;
    defaultQa: AiCliTool;
    defaultDeveloper: AiCliTool;
    defaultReporter: AiCliTool;
  };
  cli: {
    claude: AiCliToolConfig;
    codex: AiCliToolConfig;
    gemini: AiCliToolConfig;
    aider: AiCliToolConfig;
  };
  workflow: {
    defaultMode: RunMode;
    defaultOutputLanguage: string;
    generateTraceability: boolean;
    requireRequirementApproval: boolean;
    requirePlanApproval: boolean;
  };
  commands: {
    build: string;
    unitTest: string;
    integrationTest: string;
    lint: string;
  };
  safety: {
    requireApprovalBeforeCode: boolean;
    requireApprovalBeforeCommit: boolean;
    maxIterations: number;
    commandTimeoutSeconds: number;
    denyFiles: string[];
    warnFiles: string[];
    denyCommands: string[];
  };
  integrations: {
    github: GitHubIntegrationConfig;
    jira: JiraIntegrationConfig;
    slack: SlackIntegrationConfig;
  };
}
