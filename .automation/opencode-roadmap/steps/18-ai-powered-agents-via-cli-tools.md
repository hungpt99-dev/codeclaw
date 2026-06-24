# Step 18: AI-Powered Agents via User's AI CLI Tools

## Mandatory Documentation Context Rule

This `opencode run` is a fresh session.

Do not rely on memory from previous OpenCode runs.

Before writing or modifying code, read the required project documentation once for this session.

After you have read the docs once in this same session, you do not need to read them again unless:

- you modify documentation files,
- you discover documentation changed,
- you are unsure about the architecture,
- you are about to make a decision that may conflict with the docs.

If this is a separate `opencode run`, a retry run, or a fix attempt, read the docs again because it is a new session.

## Docs to Read Once Per Session

Read these docs if they exist:

- README.md
- docs/DOCS_INDEX.md
- docs/AI_AGENT_RULES.md
- docs/ARCHITECTURE.md
- docs/DEVELOPMENT.md
- docs/CODE_QUALITY.md
- docs/CONTRIBUTING.md
- docs/SECURITY.md

Step-specific docs:

- docs/WORKFLOW_DESIGN.md
- docs/TECHNICAL_DESIGN.md
- docs/PRD.md

Also inspect the current repository structure:

- package.json
- pnpm-workspace.yaml
- tsconfig.base.json
- apps/
- packages/
- templates/
- .automation/opencode-roadmap/

If PDF versions exist under docs/, treat them as exported/reference documents.
Prefer Markdown files as source of truth when available.
Do not read PDF files directly if equivalent Markdown files already exist.

## Session Docs Checklist

At the beginning of this session, create an internal checklist:

- [ ] Docs loaded
- [ ] Repo structure inspected
- [ ] Step objective understood
- [ ] Files to modify identified

After docs are loaded once, mark `Docs loaded` as done in your own working notes.
Do not create a physical file for this checklist unless needed.
This checklist is for the current OpenCode session only.

## Pre-Code Summary

Before coding, summarize:

1. Docs read in this session
2. Existing architecture
3. Current step objective
4. Existing files relevant to this step
5. Files you plan to modify

Only then implement the step.

## Common Implementation Rules

- Implement only this step.
- Read required docs once at the start of this OpenCode session.
- Do not rely on memory from previous OpenCode runs.
- Do not reread the same docs repeatedly within the same session unless docs changed or you are unsure.
- Inspect current repo structure before changing files.
- Do not implement future roadmap steps.
- Do not add cloud backend.
- Do not add login.
- Do not add billing.
- Do not add desktop app.
- Do not make Jira, Slack, or GitHub required.
- Jira, Slack, and GitHub must remain optional advanced integrations.
- The app must work without Jira, Slack, or GitHub config.
- Do not bypass quality checks.
- Do not weaken scripts just to pass checks.
- Do not remove tests just to make checks pass.
- Keep changes minimal and focused.
- Prefer updating existing files over creating duplicates.
- At the end, summarize docs read, changed files, and commands run.

---

Implement Step 18: AI-Powered Agents via User's AI CLI Tools.

## Background

Currently all 5 agents (BA, Architect, PM, QA, Reporter) use deterministic template-based generation. Every requirement produces nearly identical output. The product cannot be demonstrated meaningfully.

The core product philosophy (PRD §5, Goal 3) is: **coordinate the user's existing AI coding tools.** The user already has Claude Code, Codex CLI, Gemini CLI, or Aider installed. The agents should use these same tools to generate their output — no separate API keys, no OpenAI/Ollama accounts.

This step:
1. Builds a simple mechanism to pipe prompt templates through the user's AI CLI tools
2. Replaces deterministic agent output with AI-generated output from tools like `claude --print`
3. Falls back to deterministic output when no AI CLI is available
4. Loads prompt templates from disk (`.codeclaw/prompts/`) instead of inline strings

The user configures which AI CLI to use per agent role (e.g., BA → `claude`, Architect → `claude`, PM → `gemini`). This is already defined in `config.json` under `agents.defaultBa`, `agents.defaultArchitect`, etc.

## Architecture

```
Agent function
  → Load prompt template from .codeclaw/prompts/<agent>.md
  → Render {{variables}} with workflow context
  → If AI CLI is configured:
      → Pipe prompt to: claude --print (or codex, gemini, aider)
      → Capture stdout as agent output
  → Else:
      → Use current deterministic template fallback
  → Parse/validate output
  → Return result
```

No API keys. No separate LLM providers. The user's AI CLI tool handles everything.

## Tasks

### 1. Create AI prompt runner in adapters package

Create `packages/adapters/src/ai/agentPromptRunner.ts`:

```typescript
import { execa } from "execa";

export interface AgentPromptRunnerConfig {
  command: string;        // e.g., "claude", "codex"
  args?: string[];        // e.g., ["--print"]
  timeoutSeconds: number;
}

export async function runAgentPrompt(
  prompt: string,
  config: AgentPromptRunnerConfig,
): Promise<{ success: boolean; output: string; error?: string }>
```

Implementation:
- Write prompt to a temp file (to avoid shell escaping issues)
- Run the AI CLI command with the temp file as input
- Capture stdout as the agent's output
- Handle timeout via AbortController
- Handle CLI not found (command not in PATH)
- Handle non-zero exit codes
- Clean up temp file

For each AI CLI tool:

**Claude Code** (`claude`):
```bash
claude --print < prompt.txt
```
Or: `echo "<prompt>" | claude --print`

Check: `which claude`

**Codex CLI** (`codex`):
```bash
codex < prompt.txt
```
Check: `which codex`

**Gemini CLI** (`gemini`):
```bash
gemini --print < prompt.txt
```
Check: `which gemini`

**Aider** (`aider`):
```bash
aider --message "<prompt>" --no-auto-commits --yes
```
Check: `which aider`

Note: Research exact CLI flags for each tool. The key requirement is: run a prompt, capture the text output, don't modify any files.

### 2. Add AI CLI config types to shared

In `packages/shared/src/types/domain.ts`:

```typescript
export type AiCliTool = "claude" | "codex" | "gemini" | "aider";

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
  command: string;      // Path or command name
  timeoutSeconds: number;
}
```

### 3. Update config schema with agent-to-tool mapping

In `packages/shared/src/schemas/config.schema.ts`, the config should already have agent mapping. Verify and add if missing:

```typescript
agents: {
  defaultBa: z.enum(["claude", "codex", "gemini", "aider"]).default("claude");
  defaultArchitect: z.enum(["claude", "codex", "gemini", "aider"]).default("claude");
  defaultPm: z.enum(["claude", "codex", "gemini", "aider"]).default("claude");
  defaultQa: z.enum(["claude", "codex", "gemini", "aider"]).default("claude");
  defaultReporter: z.enum(["claude", "codex", "gemini", "aider"]).default("claude");
}

cli: {
  claude: AiCliToolConfig;
  codex: AiCliToolConfig;
  gemini: AiCliToolConfig;
  aider: AiCliToolConfig;
}
```

### 4. Create agent runner service

Create `packages/adapters/src/ai/agentRunner.ts`:

```typescript
export interface AgentRunInput {
  role: AgentRole;
  promptTemplate: string;     // Template content with {{variables}}
  context: Record<string, string>;  // Variable values
  aiToolConfig?: {
    tool: AiCliTool;
    command: string;
    timeoutSeconds: number;
  };
}

export interface AgentRunResult {
  success: boolean;
  output: string;
  usedAi: boolean;           // True if AI CLI was used, false if fallback
  error?: string;
}

export async function runAgent(input: AgentRunInput): Promise<AgentRunResult>
```

Logic:
1. Render prompt template with context using existing `renderPrompt`
2. If `aiToolConfig` is provided and the tool is available:
   - Call `runAgentPrompt` with the rendered prompt
   - Return AI output
3. If no AI tool or not available:
   - Use deterministic fallback (current template itself is the output)
   - Return rendered template as output
4. Return result with `usedAi` flag

### 5. Refactor agents to use agent runner

Each agent in `packages/core/src/agents/` should be refactored to:

1. **Load prompt from disk** instead of inline strings
2. **Use `runAgent`** to generate output
3. **Fall back to deterministic** when no AI CLI is available

New pattern for each agent (e.g., `baAgent.ts`):

```typescript
export async function runBaAgent(
  input: BaAgentInput,
  options?: {
    templateDir?: string;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number };
  },
): Promise<BaAgentOutput> {
  // 1. Load template from file (or use built-in fallback)
  let template: string;
  if (options?.templateDir) {
    try {
      template = await readFile(join(options.templateDir, "ba-agent.md"), "utf-8");
    } catch {
      template = FALLBACK_TEMPLATE; // Keep inline fallback
    }
  } else {
    template = FALLBACK_TEMPLATE;
  }

  // 2. If AI tool configured and available
  if (options?.aiTool) {
    const result = await runAgent({
      role: "BA",
      promptTemplate: template,
      context: { rawRequirement: input.requirement },
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      // Parse AI output into structured sections
      return parseBaOutput(result.output, input.requirement);
    }
  }

  // 3. Fallback: deterministic template rendering
  return {
    clarifiedRequirement: renderPrompt(template, context),
    // ... existing fallback logic
  };
}
```

Do this for all 5 agents. Keep the existing inline templates as fallbacks so the product always works, even without any AI CLI installed.

### 6. Add parseBaOutput helper

Since AI CLI output is unstructured text, we need light parsing to extract sections.

Create `packages/core/src/agents/parsers/baOutputParser.ts`:

```typescript
export function parseBaOutput(raw: string, requirement: string): BaAgentOutput {
  // Simple section extraction based on markdown headings:
  // # Clarified Requirement -> clarifiedRequirement
  // # Business Rules -> businessRules
  // # Acceptance Criteria -> acceptanceCriteria
  // # Open Questions -> openQuestions
  // # Assumptions -> assumptions

  // Use regex to split by ## or # headings
  // Fall back to putting entire output in clarifiedRequirement if parsing fails
}
```

Create parsers for each agent:
- `baOutputParser.ts`
- `architectOutputParser.ts`
- `pmOutputParser.ts`
- `qaOutputParser.ts`
- `reporterOutputParser.ts`

### 7. Update workflow to pass AI CLI config

Update `packages/core/src/workflows/docsOnlyWorkflow.ts`:

```typescript
export async function runDocsOnlyWorkflow(
  input: DocsOnlyWorkflowInput,
): Promise<DocsOnlyWorkflowOutput> {
  // ... existing setup ...

  // Load agent-to-tool mapping from config
  const agentMapping = config.agents; // { defaultBa: "claude", ... }
  const cliConfigs = config.cli;      // { claude: { enabled, command, timeout } }

  // For each agent, determine if we should use AI CLI
  const baTool = getAiToolConfig("BA", agentMapping, cliConfigs);

  const baOutput = await runBaAgent(
    { requirement: input.requirement },
    { templateDir, aiTool: baTool },
  );

  // ... rest of workflow, similarly updated ...
}
```

### 8. Add getAiToolConfig helper

In `packages/core/src/workflows/workflowHelpers.ts`:

```typescript
export function getAiToolConfig(
  role: AgentRole,
  agentMapping: Record<string, string>,
  cliConfigs: Record<string, { enabled: boolean; command: string; timeoutSeconds: number }>,
): { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined {
  const roleKey = `default${role.charAt(0) + role.slice(1).toLowerCase()}`;
  const toolName = agentMapping[roleKey] as AiCliTool;
  const cliConfig = cliConfigs[toolName];

  if (!cliConfig?.enabled) return undefined;

  return {
    tool: toolName,
    command: cliConfig.command,
    timeoutSeconds: cliConfig.timeoutSeconds,
  };
}
```

### 9. Update the 5 prompt template files on disk

The existing `templates/prompts/*.md` files need to be actual usable prompts for AI CLIs, not just descriptions. They should be structured as complete system prompts:

Update `templates/prompts/ba-agent.md` to be a self-contained prompt:

```markdown
You are a Business Analyst. Analyze this raw requirement and produce:
1. A clarified requirement in clear language
2. Business rules as a table (ID, Rule, Priority, Category)
3. Acceptance criteria in Given/When/Then format
4. Open questions that need stakeholder clarification
5. Assumptions made during analysis

Raw requirement:
{{rawRequirement}}

Output format:
## Clarified Requirement
...
## Business Rules
...
## Acceptance Criteria
...
## Open Questions
...
## Assumptions
...
```

Update all 5 templates similarly. Make them complete prompts that a CLI tool like `claude --print` can process directly.

### 10. Update CLI init to copy all templates

Update `apps/cli/src/commands/init.ts` to copy all agent templates including any new ones. Ensure templates are complete and self-contained.

### 11. Update doctor to check AI CLI availability

Update `apps/cli/src/commands/doctor.ts`:
- Check enabled AI CLI tools: `which claude`, `which codex`, `which gemini`, `which aider`
- Show status per tool
- Show agent-to-tool mapping

### 12. Add tests

- Test `runAgentPrompt` with mock command
- Test `runAgent` with AI enabled (mock) and disabled paths
- Test output parsing for each agent
- Test that deterministic fallback still works without AI CLI
- Test agent-to-tool config mapping
- Test template loading from disk vs fallback

## Acceptance Criteria

- When AI CLI is configured and available, agents pipe prompts to `claude --print` (or configured tool) and use the output
- When no AI CLI is configured or available, agents use deterministic fallback (existing behavior)
- Prompt templates are loaded from `.codeclaw/prompts/` (not inline strings)
- Templates on disk are complete, self-contained prompts for AI CLI tools
- Agent output is parsed into structured sections
- `codeclaw doctor` shows AI CLI availability per tool
- All existing tests pass
- `pnpm build` and `pnpm typecheck` pass

## Files to Create

- `packages/adapters/src/ai/agentPromptRunner.ts`
- `packages/adapters/src/ai/agentRunner.ts`
- `packages/core/src/agents/parsers/baOutputParser.ts`
- `packages/core/src/agents/parsers/architectOutputParser.ts`
- `packages/core/src/agents/parsers/pmOutputParser.ts`
- `packages/core/src/agents/parsers/qaOutputParser.ts`
- `packages/core/src/agents/parsers/reporterOutputParser.ts`
- `packages/core/src/workflows/workflowHelpers.ts`

## Files to Modify

- `packages/shared/src/types/domain.ts` (add AiCliTool type if missing)
- `packages/shared/src/schemas/config.schema.ts` (verify agent mapping exists)
- `packages/adapters/package.json` (add execa dependency)
- `packages/adapters/src/index.ts`
- `packages/core/src/agents/baAgent.ts`
- `packages/core/src/agents/architectAgent.ts`
- `packages/core/src/agents/pmAgent.ts`
- `packages/core/src/agents/qaAgent.ts`
- `packages/core/src/agents/reporterAgent.ts`
- `packages/core/src/workflows/docsOnlyWorkflow.ts`
- `packages/core/src/index.ts`
- `apps/cli/src/commands/run.ts`
- `apps/cli/src/commands/init.ts`
- `apps/cli/src/commands/doctor.ts`
- `templates/prompts/ba-agent.md`
- `templates/prompts/architect-agent.md`
- `templates/prompts/pm-agent.md`
- `templates/prompts/qa-agent.md`
- `templates/prompts/reporter-agent.md`

## Rules

Implement only this step.
Do NOT add OpenAI/Ollama API integration.
Do NOT require API keys.
Do NOT add cloud backend.
Do NOT add login.
Do NOT add billing.
Do NOT add desktop app.
Do NOT add Jira/Slack/GitHub integration.
All agent generation must use the user's installed AI CLI tools, not remote APIs.
Deterministic fallback must always work when no AI CLI is available.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
