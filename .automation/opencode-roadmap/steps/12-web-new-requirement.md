# Step 12: Web New Requirement

Implement Step 12: Web New Requirement.

Create NewRequirementPage form.

Fields:

- requirement textarea
- output language select:
  - English
  - Vietnamese
  - Bilingual

- mode select:
  - Docs-only only for now

Button:

- Start Workflow

On submit:

```
POST /api/runs
```

Send:

- rawRequirement
- outputLanguage
- mode

After success:

- redirect to Run Detail page.

Validation:

- requirement is required.
- show clear error if API fails.

Acceptance criteria:
user can create a docs-only run from UI.
generated run is saved.
user is redirected to run detail page.

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
