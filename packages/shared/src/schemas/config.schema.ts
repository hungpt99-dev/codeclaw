import { z } from "zod";
import { RunMode } from "../types/domain.js";

const aiCliToolSchema = z.enum(["claude", "codex", "gemini", "aider", "opencode"] as const);

const aiCliToolConfigSchema = z.object({
  enabled: z.boolean(),
  command: z.string(),
  timeoutSeconds: z.number().int().positive(),
});

const agentBackendConfigSchema = z.object({
  provider: z.enum(["openai-compatible", "mock", "none"]).default("none"),
  model: z.string().default("gpt-4o-mini"),
  baseUrl: z.string().default("https://api.openai.com/v1"),
  apiKeyEnv: z.string().default("CODECLAW_OPENAI_API_KEY"),
  timeoutMs: z.number().int().positive().default(60000),
});

const slackNotifyEnum = z.enum([
  "docs_generated",
  "code_generated",
  "test_passed",
  "test_failed",
  "report_ready",
]);

export type SlackNotifyEvent = z.infer<typeof slackNotifyEnum>;

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
    defaultPo: aiCliToolSchema.default("claude"),
    defaultArchitect: aiCliToolSchema.default("claude"),
    defaultPm: aiCliToolSchema.default("claude"),
    defaultQa: aiCliToolSchema.default("claude"),
    defaultDeveloper: aiCliToolSchema.default("claude"),
    defaultReporter: aiCliToolSchema.default("claude"),
    defaultIntegrationPlanner: aiCliToolSchema.default("claude"),
    defaultDevopsRelease: aiCliToolSchema.default("claude"),
    defaultCodingPlanner: aiCliToolSchema.default("claude"),
  }),
  cli: z.object({
    claude: aiCliToolConfigSchema,
    codex: aiCliToolConfigSchema,
    gemini: aiCliToolConfigSchema,
    aider: aiCliToolConfigSchema,
    opencode: aiCliToolConfigSchema,
  }),
  workflow: z.object({
    defaultMode: z.enum(Object.values(RunMode) as [string, ...string[]]),
    defaultOutputLanguage: z.string(),
    generateTraceability: z.boolean(),
    generateIntegrationPlan: z.boolean().optional().default(false),
    generateReleasePlan: z.boolean().optional().default(false),
    requireScopeApproval: z.boolean(),
    requireRequirementApproval: z.boolean(),
    requirePlanApproval: z.boolean(),
  }),
  agentBackend: agentBackendConfigSchema.optional().default({
    provider: "none",
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "CODECLAW_OPENAI_API_KEY",
    timeoutMs: 60000,
  }),
  commands: z.object({
    build: z.string(),
    unitTest: z.string(),
    integrationTest: z.string(),
    lint: z.string(),
  }),
  safety: z.object({
    requireApprovalBeforeCode: z.boolean(),
    requireApprovalBeforeCommit: z.boolean(),
    requireApprovalBeforeExternalUpdate: z.boolean(),
    maxIterations: z.number().int().positive(),
    commandTimeoutSeconds: z.number().int().positive(),
    denyFiles: z.array(z.string()),
    warnFiles: z.array(z.string()),
    denyCommands: z.array(z.string()),
  }),
  integrations: z.object({
    github: z.object({
      enabled: z.boolean().default(false),
      mode: z.enum(["gh-cli"]).default("gh-cli"),
      owner: z.string().optional(),
      repo: z.string().optional(),
    }),
    jira: z.object({
      enabled: z.boolean().default(false),
      siteUrl: z.string().optional(),
      email: z.string().optional(),
      projectKey: z.string().optional(),
      defaultIssueType: z.enum(["epic", "story", "task", "subtask"]).default("task"),
      tokenEnvRef: z.string().default("CODECLAW_JIRA_TOKEN"),
    }),
    slack: z.object({
      enabled: z.boolean().default(false),
      channelId: z.string().optional(),
      tokenEnvRef: z.string().default("CODECLAW_SLACK_TOKEN"),
      notifyOn: z.array(slackNotifyEnum).default(["report_ready"]),
    }),
  }),
});

export type Config = z.infer<typeof configSchema>;

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
    defaultPo: "claude",
    defaultArchitect: "claude",
    defaultPm: "claude",
    defaultQa: "claude",
    defaultDeveloper: "claude",
    defaultReporter: "claude",
    defaultIntegrationPlanner: "claude",
    defaultDevopsRelease: "claude",
    defaultCodingPlanner: "claude",
  },
  cli: {
    claude: { enabled: false, command: "claude", timeoutSeconds: 900 },
    codex: { enabled: false, command: "codex", timeoutSeconds: 900 },
    gemini: { enabled: false, command: "gemini", timeoutSeconds: 900 },
    aider: { enabled: false, command: "aider", timeoutSeconds: 900 },
    opencode: { enabled: false, command: "opencode", timeoutSeconds: 900 },
  },
  workflow: {
    defaultMode: "docs-only",
    defaultOutputLanguage: "bilingual",
    generateTraceability: false,
    generateIntegrationPlan: false,
    generateReleasePlan: false,
    requireScopeApproval: false,
    requireRequirementApproval: false,
    requirePlanApproval: false,
  },
  agentBackend: {
    provider: "none",
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "CODECLAW_OPENAI_API_KEY",
    timeoutMs: 60000,
  },
  commands: {
    build: "",
    unitTest: "",
    integrationTest: "",
    lint: "",
  },
  safety: {
    requireApprovalBeforeCode: true,
    requireApprovalBeforeCommit: true,
    requireApprovalBeforeExternalUpdate: true,
    maxIterations: 3,
    commandTimeoutSeconds: 900,
    denyFiles: [".env", ".env.*", "*.pem", "*.key", "credentials.json"],
    warnFiles: ["pom.xml", "build.gradle", "package.json", "Dockerfile"],
    denyCommands: ["rm -rf /", "sudo", "chmod 777", "curl | sh", "wget | sh"],
  },
  integrations: {
    github: {
      enabled: false,
      mode: "gh-cli",
    },
    jira: {
      enabled: false,
      defaultIssueType: "task",
      tokenEnvRef: "CODECLAW_JIRA_TOKEN",
    },
    slack: {
      enabled: false,
      notifyOn: ["report_ready"],
      tokenEnvRef: "CODECLAW_SLACK_TOKEN",
    },
  },
};
