# Step 13: Web Run Detail

Implement Step 13: Web Run Detail.

RunDetailPage should fetch:

```
GET /api/runs/:id
GET /api/runs/:id/artifacts
```

Show:

- run title
- status
- mode
- created at
- raw requirement

Show artifact groups:

- Input
- Requirement
- Design
- Tasks
- Tests
- Report
- Logs placeholder

For each artifact:

- fetch artifact content
- render markdown with MarkdownViewer

Group by path:

- requirement/
- design/
- tasks/
- tests/
- report/

Actions:

- Copy artifact content
- Refresh

Acceptance criteria:
user can view generated markdown artifacts.
artifact content renders correctly.
missing artifact shows friendly message.

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
