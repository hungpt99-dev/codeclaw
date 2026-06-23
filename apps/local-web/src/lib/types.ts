export interface Run {
  id: string;
  title: string;
  rawRequirement: string;
  mode: string;
  outputLanguage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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

export interface ExportOptions {
  format: "markdown" | "html" | "docx" | "pdf" | "zip";
  includeLogs?: boolean;
  includeDiff?: boolean;
  title?: string;
  author?: string;
}

export interface ExportResult {
  success: boolean;
  outputPath: string;
  format: string;
  fileSize: number;
  error?: string;
}
