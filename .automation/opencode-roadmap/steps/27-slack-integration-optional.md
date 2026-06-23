# Step 27: Slack Integration (Optional — Post-Only)

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

- docs/CLI_COMMAND_SPEC.md
- docs/TECHNICAL_DESIGN.md
- docs/PRD.md
- docs/WORKFLOW_DESIGN.md

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
- **Integration is OPTIONAL. The app must work without Slack config.**
- **Slack bot token is stored via environment variable, never in config.json.**
- **Posting to Slack requires user approval.**
- **MVP is post-only. No Slack event receiving.**
- Do not bypass quality checks.
- Do not weaken scripts just to pass checks.
- Do not remove tests just to make checks pass.
- Keep changes minimal and focused.
- Prefer updating existing files over creating duplicates.
- At the end, summarize docs read, changed files, and commands run.

---

Implement Step 27: Slack Integration (Optional — Post-Only).

## Background

The docs (Technical §24.3, CLI Spec §37) define Slack integration as optional. The product must work without it.

**MVP behavior: Post-only.** The product can post messages to a Slack channel when workflow events occur (docs generated, code generated, test passed, final report ready).

**Not in MVP:** Receiving Slack events, Slack bot commands, interactive messages. These require a public callback URL which is not compatible with the local-first architecture without additional tooling (ngrok, Cloudflare Tunnel, Tailscale Funnel — all out of scope).

Slack integration uses the Slack Web API with a Bot Token. Token is stored via environment variable only.

## Tasks

### 1. Add Slack integration config to shared schema

In `packages/shared/src/schemas/config.schema.ts`:

```typescript
integrations: {
  slack: {
    enabled: z.boolean().default(false);
    channelId: z.string().optional();
    tokenEnvRef: z.string().default("AITEAM_SLACK_TOKEN");
    notifyOn: z.array(z.enum([
      "docs_generated",
      "code_generated",
      "test_passed",
      "test_failed",
      "report_ready",
    ])).default(["report_ready"]);
  };
}
```

Default: `enabled: false`. Token stored in environment variable.

### 2. Create Slack message templates

Create `packages/core/src/integrations/slackMessageTemplates.ts`:

```typescript
export interface SlackMessageInput {
  runTitle: string;
  runId: string;
  status: string;
  artifactSummary?: string;
  testResult?: string;
  reviewResult?: string;
  changedFiles?: string[];
}

export function buildWorkflowStartedMessage(input: SlackMessageInput): string
export function buildDocsGeneratedMessage(input: SlackMessageInput): string
export function buildCodeGeneratedMessage(input: SlackMessageInput): string
export function buildTestResultMessage(input: SlackMessageInput): string
export function buildReportReadyMessage(input: SlackMessageInput): string
```

Each function returns a markdown-formatted message suitable for Slack.

Example (report ready):

```
*📋 AITeam Delivery Report Ready*

*Project:* <project name>
*Requirement:* <run title>
*Status:* REPORT_GENERATED

*Artifacts generated:*
• Clarified Requirement
• Technical Design
• Task Breakdown
• Test Matrix
• Final Report

*Run ID:* <runId>
*View in browser:* http://localhost:4317/runs/<runId>
```

### 3. Create Slack API adapter

Create `packages/adapters/src/integrations/slackAdapter.ts`:

```typescript
export interface SlackConfig {
  enabled: boolean;
  channelId?: string;
  tokenEnvRef: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  mrkdwn: boolean;
}

export interface SlackResult {
  success: boolean;
  ts?: string;  // Slack message timestamp
  error?: string;
}
```

Methods:

**`testConnection(config)`** — Verify Slack API access:
- Call `POST /api/auth.test`
- Validate bot token is valid and has required scopes

**`postMessage(message, config)`** — Post message to Slack channel:
- Call `POST /api/chat.postMessage`
- Use markdown formatting
- Return message timestamp

### 4. Create Slack API service

Create `packages/adapters/src/integrations/slackApiService.ts`:

```typescript
export async function slackRequest<T>(
  config: SlackConfig,
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T>
```

- Read token from `process.env[config.tokenEnvRef]`
- Use `Authorization: Bearer <token>` header
- Use native fetch (Node 24+)
- Call `https://slack.com/api/<endpoint>`

Handle errors: invalid token, channel not found, missing scopes, rate limiting.

### 5. Create Slack notifier service

Create `packages/adapters/src/integrations/slackNotifier.ts`:

```typescript
export async function notifySlack(
  config: SlackConfig,
  event: "docs_generated" | "code_generated" | "test_passed" | "test_failed" | "report_ready",
  input: SlackMessageInput,
): Promise<SlackResult>
```

- Check if event type is in `config.notifyOn`
- Build message using template
- Require approval before posting (Gate 5)
- Post to Slack channel

### 6. Create CLI command: aiteam slack

Create `apps/cli/src/commands/slack.ts`:

```bash
aiteam slack status
aiteam slack test
aiteam slack post --run <runId> [--event report_ready] [--approve]
```

Register in CLI entry point:

```typescript
const slackProgram = program.command("slack").description("Slack integration (optional)");

slackProgram
  .command("status")
  .action(slackStatusCommand);

slackProgram
  .command("test")
  .action(slackTestCommand);

slackProgram
  .command("post")
  .option("--run <runId>", "Run ID")
  .option("--event <event>", "Event type")
  .option("--approve", "Skip approval")
  .action(slackPostCommand);
```

### 7. Wire Slack notifications into workflows (optional)

In `packages/core/src/workflows/` (docsOnly, assisted, semiAuto):

After workflow completion, if Slack integration is enabled:
1. Check if `report_ready` is in `notifyOn` config
2. Build message from run results
3. Require approval (Gate 5)
4. Post to Slack

This should be handled by a workflow hook rather than inline logic:

```typescript
// In workflow completion handler
if (config.integrations?.slack?.enabled) {
  await notifySlack(config.integrations.slack, "report_ready", messageInput);
}
```

### 8. Wire approval gate for Slack

Gate 5 (EXTERNAL_UPDATE) applies:
- Posting any message to Slack requires user approval
- Approval modal in web UI shows: channel, message preview
- CLI: `--approve` flag skips approval

### 9. Add Slack section in web UI

In `apps/local-web/src/pages/Settings.tsx`:
- Slack integration toggle
- Fields: Channel ID, Bot Token (masked input — but stored in env)
- Notify on events: checkboxes (docs_generated, code_generated, test_passed, test_failed, report_ready)
- [Test Connection] button
- Status indicator

In `apps/local-web/src/pages/RunDetail.tsx`:
- After workflow completes, if Slack is enabled, show [Post to Slack] button
- Button shows message preview and requires confirmation

### 10. Token handling — environment variable only

Never store Slack token in config.json.

```typescript
function getSlackToken(config: SlackConfig): string | undefined {
  return process.env[config.tokenEnvRef];
}
```

Update `.env.example`:
```bash
# AITEAM_SLACK_TOKEN=xoxb-<your-slack-bot-token>
```

### 11. Update doctor command

Update `apps/cli/src/commands/doctor.ts`:
- If Slack integration is enabled, check:
  - Config has channelId
  - Token environment variable is set
  - Connection test (optional)

### 12. Add tests

- Test Slack message templates
- Test Slack API service with mock fetch
- Test CLI commands with mock adapter
- Test that all commands work gracefully when Slack is not configured
- Test token is read from env, not config
- Test that posting requires approval
- Test notify-on-event filtering

## Acceptance Criteria

- `aiteam slack status` shows Slack integration status
- `aiteam slack test` tests connection when Slack is configured
- `aiteam slack post --run <runId>` posts a report-ready message after approval
- Slack message templates exist for all workflow events
- Web UI shows Slack section with [Post to Slack] button
- All commands work gracefully when Slack is not configured
- The app works COMPLETELY NORMAL without any Slack config
- All existing tests pass

## Files to Create

- `packages/core/src/integrations/slackMessageTemplates.ts`
- `packages/adapters/src/integrations/slackAdapter.ts`
- `packages/adapters/src/integrations/slackApiService.ts`
- `packages/adapters/src/integrations/slackNotifier.ts`
- `apps/cli/src/commands/slack.ts`

## Files to Modify

- `packages/shared/src/schemas/config.schema.ts`
- `packages/shared/src/types/domain.ts`
- `packages/shared/src/index.ts`
- `packages/adapters/src/index.ts`
- `packages/core/src/index.ts`
- `packages/core/src/workflows/docsOnlyWorkflow.ts`
- `packages/core/src/workflows/assistedWorkflow.ts`
- `packages/core/src/workflows/semiAutoWorkflow.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/commands/doctor.ts`
- `apps/local-web/src/pages/RunDetail.tsx`
- `apps/local-web/src/pages/Settings.tsx`
- `apps/local-web/src/lib/api.ts`
- `apps/local-web/src/lib/types.ts`
- `packages/server/src/routes/runs.routes.ts`
- `.env.example`

## Rules

Implement only this step.
Integration is OPTIONAL. Zero config required. App must work without it.
Slack bot token goes to environment variables, NEVER in config.json.
Post-only mode. No Slack event receiving. No interactive messages.
All Slack posts require user approval.
Do not add cloud backend.
Do not add login.
Do not add billing.
Do not add desktop app.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
