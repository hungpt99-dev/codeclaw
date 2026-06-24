export { runAgentPrompt } from "./ai/agentPromptRunner.js";
export type { AgentPromptRunnerConfig } from "./ai/agentPromptRunner.js";
export { runAgent, renderPrompt } from "./ai/agentRunner.js";
export type { AiCliTool, AgentRole, AgentRunInput, AgentRunResult } from "./ai/agentRunner.js";

export { runShellCommand } from "./shell/shellRunner.js";
export type { ShellRunInput, ShellRunResult } from "./shell/shellRunner.js";

export { createClaudeCodeAdapter } from "./ai/adapters/claudeCodeAdapter.js";
export { createCodexAdapter } from "./ai/adapters/codexAdapter.js";
export { createGeminiAdapter } from "./ai/adapters/geminiAdapter.js";
export { createAiderAdapter } from "./ai/adapters/aiderAdapter.js";
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

export {
  getSlackStatus,
  testConnection as testSlackConnection,
  postMessage as postSlackMessage,
} from "./integrations/slackAdapter.js";
export type {
  SlackConfig,
  SlackMessage,
  SlackResult,
  SlackStatus,
  AuthTestResult,
} from "./integrations/slackAdapter.js";

export { slackRequest, SlackApiError } from "./integrations/slackApiService.js";

export { notifySlack } from "./integrations/slackNotifier.js";

export { exportRunArtifacts } from "./export/exportService.js";
export type { ExportFormat, ExportOptions, ExportResult } from "./export/exportService.js";
export { runTests } from "./test/testRunner.js";
export type { TestCommand, TestResult, TestRunResult } from "./test/testRunner.js";
export {
  parseMavenOutput,
  parseNpmOutput,
  parseGradleOutput,
  parseGenericOutput,
} from "./test/testOutputParser.js";
export type { ParsedTestFailure } from "./test/testOutputParser.js";
export { writeTestResultArtifacts } from "./test/testResultWriter.js";
export type { WriteResult as TestResultWriteResult } from "./test/testResultWriter.js";

export { convertMdToHtml } from "./export/mdToHtml.js";
export type { HtmlDocumentOptions } from "./export/mdToHtml.js";
export { convertHtmlToDocx } from "./export/htmlToDocx.js";
export type { DocxOptions } from "./export/htmlToDocx.js";
export { convertHtmlToPdf } from "./export/htmlToPdf.js";
export type { PdfOptions } from "./export/htmlToPdf.js";
export { buildCombinedMarkdown, tocFromMarkdown } from "./export/utils.js";
export type { ArtifactRecord, RunInfo } from "./export/utils.js";
