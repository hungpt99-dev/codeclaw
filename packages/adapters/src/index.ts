export { runAgentPrompt } from "./ai/agentPromptRunner.js";
export type { AgentPromptRunnerConfig } from "./ai/agentPromptRunner.js";
export { runAgent, renderPrompt } from "./ai/agentRunner.js";
export type { AiCliTool, AgentRole, AgentRunInput, AgentRunResult } from "./ai/agentRunner.js";

export { runShellCommand } from "./shell/shellRunner.js";
export type { ShellRunInput, ShellRunResult } from "./shell/shellRunner.js";

export { createClaudeCodeAdapter } from "./ai/adapters/claudeCodeAdapter.js";
export { createCodexAdapter } from "./ai/adapters/codexAdapter.js";
export { createAdapter } from "./ai/adapterFactory.js";
export type { AiCliAdapter } from "./ai/aiCliAdapter.js";

export {
  getGitStatus,
  saveGitSnapshot,
  getChangedFiles,
  generateDiff,
  getDiffStats,
} from "./git/gitService.js";

export { generateDiffPatchFiles } from "./diff/diffService.js";
export type { DiffFile } from "./diff/diffService.js";

export {
  checkStatus,
  testConnection,
  generatePRSummary,
  createPR,
  readCIRun,
  readPRStatus,
  readPRDetail,
} from "./integrations/gitHubAdapter.js";
export type {
  GitHubConfig,
  PRSummaryInput,
  PRSummaryResult,
  GitHubStatus,
  CheckStatusResult,
  TestConnectionResult,
  CIRunInfo,
  PRInfo,
} from "./integrations/gitHubAdapter.js";

export {
  isGhCliAvailable,
  isGhAuthenticated,
  getCurrentRepo,
  createGhPR,
  getGhPRStatus,
  getGhPRView,
  getCIRuns,
  getGhCliVersion,
} from "./integrations/gitHubCliService.js";

export {
  getJiraStatus,
  testConnection as testJiraConnection,
  createIssue as createJiraIssue,
  createIssuesFromRun,
} from "./integrations/jiraAdapter.js";
export type {
  JiraConfig,
  JiraIssueInput,
  JiraIssueResult,
  JiraTestConnectionResult,
  JiraStatus,
  CreateIssuesFromRunInput,
} from "./integrations/jiraAdapter.js";

export { jiraRequest, JiraApiError } from "./integrations/jiraApiService.js";
