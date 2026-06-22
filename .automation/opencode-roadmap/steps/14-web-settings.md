# Step 14: Web Settings

Implement Step 14: Web Settings.

SettingsPage should use:

```
GET /api/settings
PUT /api/settings
```

Fields:

- project name
- project type
- default output language
- build command
- unit test command
- integration test command
- lint command
- max iterations
- command timeout

Validation:

- max iterations must be positive.
- timeout must be positive.
- required fields should be handled clearly.

Actions:

- Save Settings
- Reload Settings

Acceptance criteria:
user can view settings.
user can update settings.
config.json is updated or settings persistence works.
invalid settings show error.

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
