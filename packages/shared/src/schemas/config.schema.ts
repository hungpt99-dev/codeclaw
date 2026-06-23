import { z } from "zod";
import { RunMode } from "../types/domain.js";

const aiCliToolSchema = z.enum(["claude", "codex", "gemini", "aider"] as const);

const aiCliToolConfigSchema = z.object({
  enabled: z.boolean(),
  command: z.string(),
  timeoutSeconds: z.number().int().positive(),
});

export const configSchema = z.object({
  version: z.string(),
  project: z.object({
    name: z.string(),
    type: z.string(),
    language: z.string(),
    framework: z.string(),
    workingDir: z.string(),
  }),
  agents: z.object({
    defaultBa: aiCliToolSchema.default("claude"),
    defaultArchitect: aiCliToolSchema.default("claude"),
    defaultPm: aiCliToolSchema.default("claude"),
    defaultQa: aiCliToolSchema.default("claude"),
    defaultReporter: aiCliToolSchema.default("claude"),
  }),
  cli: z.object({
    claude: aiCliToolConfigSchema,
    codex: aiCliToolConfigSchema,
    gemini: aiCliToolConfigSchema,
    aider: aiCliToolConfigSchema,
  }),
  workflow: z.object({
    defaultMode: z.enum(Object.values(RunMode) as [string, ...string[]]),
    defaultOutputLanguage: z.string(),
    generateTraceability: z.boolean(),
  }),
  commands: z.object({
    build: z.string(),
    unitTest: z.string(),
    integrationTest: z.string(),
    lint: z.string(),
  }),
  safety: z.object({
    requireApprovalBeforeCode: z.boolean(),
    maxIterations: z.number().int().positive(),
    commandTimeoutSeconds: z.number().int().positive(),
    denyFiles: z.array(z.string()),
    denyCommands: z.array(z.string()),
  }),
});

export type Config = z.infer<typeof configSchema>;

const defaultCliToolConfig = { enabled: false, command: "", timeoutSeconds: 300 };

export const defaultConfig: Config = {
  version: "0.1.0",
  project: {
    name: "",
    type: "generic",
    language: "",
    framework: "",
    workingDir: ".",
  },
  agents: {
    defaultBa: "claude",
    defaultArchitect: "claude",
    defaultPm: "claude",
    defaultQa: "claude",
    defaultReporter: "claude",
  },
  cli: {
    claude: { ...defaultCliToolConfig, command: "claude" },
    codex: { ...defaultCliToolConfig, command: "codex" },
    gemini: { ...defaultCliToolConfig, command: "gemini" },
    aider: { ...defaultCliToolConfig, command: "aider" },
  },
  workflow: {
    defaultMode: "docs-only",
    defaultOutputLanguage: "bilingual",
    generateTraceability: false,
  },
  commands: {
    build: "",
    unitTest: "",
    integrationTest: "",
    lint: "",
  },
  safety: {
    requireApprovalBeforeCode: true,
    maxIterations: 3,
    commandTimeoutSeconds: 900,
    denyFiles: [".env", ".env.*", "*.pem", "*.key", "credentials.json"],
    denyCommands: ["rm -rf /", "sudo", "chmod 777", "curl | sh", "wget | sh"],
  },
};
