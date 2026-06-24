import type { AiAdapterName, AiAdapterConfig } from "@codeclaw/shared";
import type { AiCliAdapter } from "./aiCliAdapter.js";
import { createClaudeCodeAdapter } from "./adapters/claudeCodeAdapter.js";
import { createCodexAdapter } from "./adapters/codexAdapter.js";
import { createGeminiAdapter } from "./adapters/geminiAdapter.js";
import { createAiderAdapter } from "./adapters/aiderAdapter.js";
import { createOpenCodeAdapter } from "./adapters/opencodeAdapter.js";

export function createAdapter(name: AiAdapterName, config: AiAdapterConfig): AiCliAdapter | null {
  if (!config.enabled) {
    return null;
  }

  switch (name) {
    case "claude":
      return createClaudeCodeAdapter();
    case "codex":
      return createCodexAdapter();
    case "gemini":
      return createGeminiAdapter();
    case "aider":
      return createAiderAdapter();
    case "opencode":
      return createOpenCodeAdapter({
        command: config.command,
        timeoutSeconds: config.timeoutSeconds,
      });
    default:
      return null;
  }
}
