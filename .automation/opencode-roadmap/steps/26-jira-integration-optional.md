# Step 26: Jira Integration (Optional — Export + API)

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
- **Integration is OPTIONAL. The app must work without Jira config.**
- **Jira API tokens are stored via environment variables, never in config.json.**
- **Creating Jira issues requires user approval.**
- **MVP starts with Jira-ready markdown export. API integration is step 2.**
- Do not bypass quality checks.
- Do not weaken scripts just to pass checks.
- Do not remove tests just to make checks pass.
- Keep changes minimal and focused.
- Prefer updating existing files over creating duplicates.
- At the end, summarize docs read, changed files, and commands run.

---

Implement Step 26: Jira Integration (Optional — Export + API).

## Background

The docs (Technical §24.2, CLI Spec §36) define Jira integration as optional. The product must work without it. Jira integration has two tiers:

**Tier 1 (MVP): Jira-ready Markdown export** — Generate copyable markdown formatted for Jira. No API required. The user manually pastes into Jira.

**Tier 2 (API): Jira API issue creation** — After user approval, create epics, stories, and subtasks via Jira REST API using a user-provided API token.

This step implements both tiers, but Tier 2 is optional and requires explicit user configuration + approval.

## Tasks

### 1. Add Jira integration config to shared schema

In `packages/shared/src/schemas/config.schema.ts`:

```typescript
integrations: {
  jira: {
    enabled: z.boolean().default(false);
    siteUrl: z.string().optional();
    email: z.string().optional();
    projectKey: z.string().optional();
    defaultIssueType: z.enum(["epic", "story", "task", "subtask"]).default("task");
    tokenEnvRef: z.string().default("CODECLAW_JIRA_TOKEN");
  };
}
```

Default: `enabled: false`. Token stored in environment variable, never in config.

### 2. Create Jira-ready markdown generator

Create `packages/core/src/integrations/jiraMarkdownGenerator.ts`:

```typescript
export interface JiraExportInput {
  run: RunRecord;
  artifacts: {
    taskBreakdown: string;
    acceptanceCriteria: string;
    technicalDesign: string;
  };
}

export function generateJiraReadyMarkdown(input: JiraExportInput): string
```

Output format:

```markdown
*Epic: <run title>*

*Story: <story title>*
*Description:*
<requirement summary>

*Acceptance Criteria:*
- AC-001: ...
- AC-002: ...

*Subtasks:*
- [ ] TASK-001: <title>
- [ ] TASK-002: <title>

*Definition of Done:*
- Code reviewed
- Tests pass
- Acceptance criteria met
```

Use the task breakdown and acceptance criteria from run artifacts to populate.

### 3. Create Jira API adapter

Create `packages/adapters/src/integrations/jiraAdapter.ts`:

```typescript
export interface JiraConfig {
  enabled: boolean;
  siteUrl?: string;
  email?: string;
  projectKey?: string;
  defaultIssueType?: string;
  tokenEnvRef: string;
}

export interface JiraIssueInput {
  projectKey: string;
  summary: string;
  description: string;
  issueType: string;
  parentKey?: string;
}

export interface JiraIssueResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}
```

Methods:

**`testConnection(config)`** — Verify Jira API access:
- Call `GET /rest/api/3/myself` with Basic auth
- Validate response

**`createIssue(input, config)`** — Create Jira issue:
- Call `POST /rest/api/3/issue`
- Create epic, story, or subtask
- Link parent-child if applicable

**`createIssuesFromRun(input, config, approval)`** — Create full hierarchy:
1. Create epic for the run
2. Create stories for each major task
3. Create subtasks linked to stories

All API calls require user approval.

### 4. Create Jira API service

Create `packages/adapters/src/integrations/jiraApiService.ts`:

```typescript
export async function jiraRequest<T>(
  config: JiraConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<T>
```

- Read token from `process.env[config.tokenEnvRef]`
- Use Basic auth with email + token
- Use native fetch (Node 24+)

Handle errors: invalid token, network error, rate limiting, project not found.

### 5. Create CLI command: codeclaw jira

Create `apps/cli/src/commands/jira.ts`:

```bash
codeclaw jira status
codeclaw jira test
codeclaw jira export --run <runId>
codeclaw jira create --run <runId> [--approve]
codeclaw jira comment --run <runId> --issue <issueKey> [--approve]
```

Register in CLI entry point:

```typescript
const jiraProgram = program.command("jira").description("Jira integration (optional)");

jiraProgram
  .command("status")
  .action(jiraStatusCommand);

jiraProgram
  .command("test")
  .action(jiraTestCommand);

jiraProgram
  .command("export")
  .option("--run <runId>", "Run ID")
  .action(jiraExportCommand);

jiraProgram
  .command("create")
  .option("--run <runId>", "Run ID")
  .option("--approve", "Skip approval")
  .action(jiraCreateCommand);

jiraProgram
  .command("comment")
  .option("--run <runId>", "Run ID")
  .option("--issue <issueKey>", "Jira issue key")
  .option("--approve", "Skip approval")
  .action(jiraCommentCommand);
```

### 6. Wire approval gate for Jira API

Gate 5 (EXTERNAL_UPDATE) applies:
- `jira export` — no approval needed (only generates markdown)
- `jira create` — requires approval (modifies Jira)
- `jira comment` — requires approval (modifies Jira)

### 7. Add Jira-ready export to task artifacts

Update `packages/core/src/agents/pmAgent.ts` (or related):
- Add `jira-ready-tasks.md` to the task generation output
- This is a markdown file formatted for copying into Jira

### 8. Add Jira section in web UI

In `apps/local-web/src/pages/RunDetail.tsx`:
- If run has Jira-ready task artifacts, show a "Jira" tab or section
- Show: Jira-ready markdown preview, [Copy to Clipboard], [Create Jira Issues] button
- Create Jira Issues button shows approval modal if integration is enabled

In `apps/local-web/src/pages/Settings.tsx`:
- Jira integration toggle
- Fields: Site URL, Email, Project Key, Default Issue Type
- [Test Connection] button
- Status indicator

### 9. Token handling — environment variable only

Never store Jira token in config.json. Follow the pattern:

```typescript
function getJiraToken(config: JiraConfig): string | undefined {
  return process.env[config.tokenEnvRef];
}
```

Update `.env.example`:
```bash
# CODECLAW_JIRA_TOKEN=<your-jira-api-token>
```

### 10. Update doctor command

Update `apps/cli/src/commands/doctor.ts`:
- If Jira integration is enabled, check:
  - Config has siteUrl, email, projectKey
  - Token environment variable is set
  - Connection test (optional)

### 11. Add tests

- Test Jira-ready markdown generation with sample artifacts
- Test Jira API service with mock fetch
- Test CLI commands with mock adapter
- Test that all commands work gracefully when Jira is not configured
- Test token is read from env, not config
- Test that API calls require approval

## Acceptance Criteria

- `codeclaw jira export --run <runId>` generates Jira-ready markdown from run artifacts
- `codeclaw jira test` tests connection when Jira is configured
- `codeclaw jira create` creates issues only after user approval
- Jira-ready task artifacts are generated during workflow
- Web UI shows Jira-ready markdown with copy button
- All commands work gracefully when Jira is not configured
- The app works COMPLETELY NORMAL without any Jira config
- All existing tests pass

## Files to Create

- `packages/core/src/integrations/jiraMarkdownGenerator.ts`
- `packages/adapters/src/integrations/jiraAdapter.ts`
- `packages/adapters/src/integrations/jiraApiService.ts`
- `apps/cli/src/commands/jira.ts`

## Files to Modify

- `packages/shared/src/schemas/config.schema.ts`
- `packages/shared/src/types/domain.ts`
- `packages/shared/src/index.ts`
- `packages/adapters/src/index.ts`
- `packages/core/src/index.ts`
- `packages/core/src/agents/pmAgent.ts` (add Jira-ready output)
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
Jira API tokens go to environment variables, NEVER in config.json.
Jira (and only Jira) receives approval gate before API calls.
Jira-ready markdown export does NOT require approval.
Do not add cloud backend.
Do not add login.
Do not add billing.
Do not add desktop app.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
