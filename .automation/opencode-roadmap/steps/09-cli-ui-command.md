# Step 09: CLI UI Command

Implement Step 09: CLI UI Command.

Make `codeclaw ui` start the local Fastify server.

Defaults:

- host: 127.0.0.1
- port: 4317

Options:

- --host
- --port
- --open

Output:

```
CodeClaw UI is running.
URL: http://localhost:4317
```

Behavior:

1. Validate .codeclaw exists.
2. Start local server.
3. Print URL.
4. Keep process running.
5. If --open is passed, open browser if possible.

Acceptance criteria:
codeclaw ui starts local server.
GET /api/health works.
port option works.
clear error if port is already used.

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
