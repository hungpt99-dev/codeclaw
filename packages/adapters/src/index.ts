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
