# Step 15: Web Prompt Templates

Implement Step 15: Web Prompt Templates.

PromptTemplatesPage should use:

```
GET /api/prompts
GET /api/prompts/:name
PUT /api/prompts/:name
```

Features:

- list templates
- select template
- view content
- edit content
- save content

Templates:

- ba-agent.md
- architect-agent.md
- pm-agent.md
- qa-agent.md
- reporter-agent.md

Security:

- only allow editing files inside .ai-team/prompts.
- reject path traversal.

Acceptance criteria:
user can list prompt templates.
user can view template.
user can edit and save template.
cannot read/write outside prompts folder.

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
