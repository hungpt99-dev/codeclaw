# Step 36: Web UI Integrations Page & Full Settings Sections

Implement Step 36: Web UI Integrations Page & Full Settings Sections.

## Background

Local Web UI Spec defines several pages and settings sections that are currently missing or placeholder:
- Integrations Page (SS34-37) — GitHub, Jira, Slack configuration cards
- AI CLI Settings (SS26) — Per-tool enable/disable, command path, test button
- Agent Mapping Settings (SS27) — Role-to-tool dropdowns
- Safety Settings (SS30) — Protected files, blocked commands, approval rules
- Documentation Settings (SS31) — Which docs to generate checkboxes
- Storage Settings (SS32) — Paths, clean actions

## Tasks

### 1. Create Integrations page

Create `apps/local-web/src/pages/Integrations.tsx`:

Integration cards for each optional service:
- GitHub: enabled toggle, mode (gh-cli), status indicator, test button
- Jira: enabled toggle, site URL, email, project key, token hint, test button
- Slack: enabled toggle, channel ID, token hint, notification checkboxes, test button

Each card shows: connection status (Connected / Not Connected / Not Configured), last test timestamp.

Add route in App.tsx and link in sidebar.

### 2. Add AI CLI settings section

In Settings page, add "AI CLI Tools" section:
- Per tool card: Claude Code, Codex CLI, Gemini CLI, Aider
- Each card: enable toggle, command path (auto-detected), status (Available/Missing/Disabled), [Test] button
- Test button runs `which <command>` via API

### 3. Add Agent Mapping section

In Settings page, add "Agent Role Mapping" section:
- Table: Role | AI CLI Tool
- Dropdown per role: BA, Product Owner, PM, Architect, Developer, QA, Reviewer, Security Reviewer, Reporter
- Options: Claude Code, Codex CLI, Gemini CLI, Aider, Disabled
- Show warning if mapped tool is not available

### 4. Add Safety Settings section

In Settings page, add "Safety" section:
- Toggle: Require approval before code generation
- Toggle: Require approval before external update
- Toggle: Require approval before rollback
- Number input: Command timeout (seconds)
- Number input: Max fix iterations
- Text area: Protected file patterns (one per line)
- Text area: Warning file patterns (one per line)
- Text area: Blocked commands (one per line)
- Safety notice banner

### 5. Add Documentation Settings section

In Settings page, add "Documentation" section:
- Checkboxes for each artifact type:
  - Clarified Requirement
  - Business Rules
  - Acceptance Criteria
  - Open Questions / Assumptions
  - Scope Definition
  - Technical Design
  - API Design
  - Database Design
  - Task Breakdown
  - Test Matrix
  - Implementation Prompt
  - Review Report
  - Security Review
  - Traceability Matrix
  - Final Report
- Output format: Markdown (default), JSON

### 6. Add Storage Settings section

In Settings page, add "Storage" section:
- Read-only fields: .codeclaw path, database path, runs path, prompts path, logs path
- Buttons: [Open .codeclaw Folder], [Open Runs Folder], [Clean Old Runs]
- Storage usage: Total runs count, total size (rough estimate)

### 7. Wire all settings to API

All sections read from and write to:
- `GET /api/settings` — Load all settings
- `PUT /api/settings` — Save settings

The settings API should be updated to handle sectioned settings.

### 8. Add API routes for new settings sections

- `GET /api/settings/ai-cli/status` — Check AI CLI availability
- `POST /api/settings/ai-cli/test` — Test specific AI CLI
- `GET /api/settings/integrations/test/:type` — Test integration connection

### 9. Add tests

- Test each settings section form validation
- Test AI CLI status API
- Test integration test API

## Acceptance Criteria

- Integrations page shows GitHub, Jira, Slack configuration cards
- AI CLI Settings shows all 4 tools with status and test
- Agent Mapping allows role-to-tool assignment
- Safety Settings shows protected files, blocked commands, approval toggles
- Documentation Settings shows artifact type checkboxes
- Storage Settings shows paths and clean actions
- All settings persist via API
- Page handles disabled/unconfigured integrations gracefully
