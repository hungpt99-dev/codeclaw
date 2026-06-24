import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@codeclaw/adapters";
import type { AiCliTool } from "@codeclaw/adapters";
import { parseUxWriterOutput } from "./parsers/uxWriterOutputParser.js";

export interface UxWriterAgentInput {
  requirement: string;
  screenDescriptions: string;
  componentTree: string;
}

export interface UxWriterAgentOutput {
  interfaceLabels: string;
  errorMessages: string;
  emptyStateText: string;
  tooltips: string;
}

const INTERFACE_LABELS_TEMPLATE = `# Interface Labels

## Labels for: {{requirement}}

| Screen | Element | Label | Purpose |
|--------|---------|-------|---------|
| Main Screen | Title | Feature Name | Identify the feature |
| Main Screen | Submit Button | Submit | Trigger the action |
| Main Screen | Cancel Button | Cancel | Abort the action |
| Confirmation | Success Title | Success! | Indicate successful completion |
| Confirmation | Error Title | Error | Indicate failure |
| Confirmation | Retry Button | Try Again | Retry the failed action |
`;

const ERROR_MESSAGES_TEMPLATE = `# Error Messages

## Errors for: {{requirement}}

| Screen | Condition | Message | Tone |
|--------|-----------|---------|------|
| Main Screen | Required field empty | "This field is required" | Neutral |
| Main Screen | Invalid format | "Please enter a valid value" | Neutral |
| Main Screen | Network error | "Connection lost. Please check your internet and try again." | Empathetic |
| Confirmation | Processing failure | "Something went wrong. Your changes were not saved." | Empathetic |
| Confirmation | Timeout | "The request took too long. Please try again." | Neutral |
`;

const EMPTY_STATE_TEMPLATE = `# Empty State Text

## Empty states for: {{requirement}}

| Screen | Message | Call to Action |
|--------|---------|----------------|
| Main Screen | "No items yet. Create your first one to get started." | "Create Item" |
| Main Screen | "No results found matching your search." | "Clear Filters" |
| Confirmation | N/A | N/A |
`;

const TOOLTIPS_TEMPLATE = `# Tooltips & Help Text

## Help for: {{requirement}}

| Screen | Element | Tooltip/Help Text |
|--------|---------|-------------------|
| Main Screen | Input Field | "Enter the required information." |
| Main Screen | Submit Button | "Submit your request for processing." |
| Main Screen | Help Icon | "Learn more about how this feature works." |
| Confirmation | Result Details | "This is a summary of what was completed." |
`;

const FALLBACK_TEMPLATES = `${INTERFACE_LABELS_TEMPLATE}\n\n${ERROR_MESSAGES_TEMPLATE}\n\n${EMPTY_STATE_TEMPLATE}\n\n${TOOLTIPS_TEMPLATE}`;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "ux-writer-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

export async function runUxWriterAgent(
  input: UxWriterAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<UxWriterAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATES;

  if (options?.aiTool) {
    const result = await runAgent({
      role: "UX_WRITER",
      promptTemplate: template,
      context: {
        requirement: input.requirement,
        screenDescriptions: input.screenDescriptions,
        componentTree: input.componentTree,
      },
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parseUxWriterOutput(result.output, input.requirement);
    }
  }

  const context = { requirement: input.requirement };

  return {
    interfaceLabels: renderPrompt(INTERFACE_LABELS_TEMPLATE, context),
    errorMessages: renderPrompt(ERROR_MESSAGES_TEMPLATE, context),
    emptyStateText: renderPrompt(EMPTY_STATE_TEMPLATE, context),
    tooltips: renderPrompt(TOOLTIPS_TEMPLATE, context),
  };
}
