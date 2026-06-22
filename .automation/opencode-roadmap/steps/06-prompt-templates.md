# Step 06: Prompt Templates

Implement Step 06: Prompt Templates.

Create templates in templates/prompts:

- ba-agent.md
- architect-agent.md
- pm-agent.md
- qa-agent.md
- reporter-agent.md

Use variables:

- {{rawRequirement}}
- {{clarifiedRequirement}}
- {{acceptanceCriteria}}
- {{technicalDesign}}
- {{taskBreakdown}}
- {{testMatrix}}

Templates should be meaningful and have clear role instructions.

Do not call real AI.

Acceptance criteria:
templates exist.
templates have clear role instructions.
templates use supported variables.

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
