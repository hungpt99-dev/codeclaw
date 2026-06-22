# Step 11: Web Dashboard and Runs

Implement Step 11: Web Dashboard and Runs.

Dashboard should show:

- Local Mode Active
- Current project
- Latest runs
- Quick actions:
  - New Requirement
  - View Runs
  - Settings

Runs page should fetch:

```
GET /api/runs
```

Show table:

- Title
- Mode
- Status
- Created At
- Action: View

Add loading states.
Add error states.
Add empty states.

Acceptance criteria:
dashboard loads.
runs page lists runs from SQLite.
clicking View opens run detail page.

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
