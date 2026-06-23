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
  REPORT_GENERATED: "REPORT_GENERATED",
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
  TEST_MATRIX: "TEST_MATRIX",
  IMPLEMENTATION_PROMPT: "IMPLEMENTATION_PROMPT",
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
    maxIterations: number;
    commandTimeoutSeconds: number;
    denyFiles: string[];
    denyCommands: string[];
  };
}
