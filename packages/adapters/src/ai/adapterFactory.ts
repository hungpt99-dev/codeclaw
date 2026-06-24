import type { AiAdapterName, AiAdapterConfig } from "@aiteam/shared";
import type { AiCliAdapter } from "./aiCliAdapter.js";
import { createClaudeCodeAdapter } from "./adapters/claudeCodeAdapter.js";
import { createCodexAdapter } from "./adapters/codexAdapter.js";
import { createGeminiAdapter } from "./adapters/geminiAdapter.js";
import { createAiderAdapter } from "./adapters/aiderAdapter.js";

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
    default:
      return null;
  }
}
