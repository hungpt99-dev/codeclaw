# Step 07: CLI MVP

Implement Step 07: CLI MVP.

Work mainly in apps/cli.

Use Commander.js.

Implement commands:

- aiteam init
- aiteam doctor
- aiteam run "raw requirement"
- aiteam list
- aiteam show <runId>
- aiteam ui

aiteam init:

1. Create .ai-team.
2. Create .ai-team/config.json.
3. Create .ai-team/database.sqlite.
4. Initialize SQLite schema.
5. Create .ai-team/prompts.
6. Copy templates.
7. Create .ai-team/runs.

Options:

- --force
- --type <type>
- --output-language <language>

Do not overwrite unless --force.

aiteam doctor checks:

- .ai-team exists
- config valid
- SQLite opens
- prompt templates exist
- Node.js available
- Git available

aiteam run:

Only docs-only mode for now.

1. Validate .ai-team.
2. Load config.
3. Create run ID.
4. Save run metadata to SQLite.
5. Execute docsOnlyWorkflow.
6. Save artifact metadata.
7. Update status to REPORT_GENERATED.
8. Print artifact list.

Options:

- --title
- --output-language
- --json

aiteam list:

Show recent runs.

aiteam show <runId>:

Show run metadata and artifact paths.

aiteam ui:

For now, start local server if available or print a clear message if dev server must be started separately.

Acceptance criteria:
aiteam init works.
aiteam doctor works.
aiteam run generates local docs.
aiteam list shows runs.
aiteam show displays run detail.
no real AI calls.
no source files outside .ai-team are modified by run.

## Rules

Implement only this step.
Do not implement future roadmap steps.
Do not add real AI calls.
Do not add cloud backend.
Do not add login.
Do not add billing.
Do not add desktop app.
Do not add Jira/Slack/GitHub integration unless this step explicitly asks.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
