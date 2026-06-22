# Step 03: Shared Package

Implement Step 03: Shared Package.

Work mainly in packages/shared.

Create:

- packages/shared/src/types/domain.ts
- packages/shared/src/schemas/config.schema.ts
- packages/shared/src/schemas/run.schema.ts
- packages/shared/src/utils/ids.ts
- packages/shared/src/utils/date.ts
- packages/shared/src/utils/fs.ts
- packages/shared/src/index.ts

Types:

- RunMode
- RunStatus
- ArtifactType
- Run
- Artifact
- AiTeamConfig

RunMode values:

- docs-only
- assisted
- semi-auto
- multi-agent

RunStatus values:

- CREATED
- SPEC_GENERATED
- PLAN_GENERATED
- REPORT_GENERATED
- FAILED
- CANCELLED

ArtifactType values:

- RAW_REQUIREMENT
- CLARIFIED_REQUIREMENT
- BUSINESS_RULES
- ACCEPTANCE_CRITERIA
- OPEN_QUESTIONS
- ASSUMPTIONS
- TECHNICAL_DESIGN
- API_DESIGN
- DB_DESIGN
- TASK_BREAKDOWN
- TEST_MATRIX
- FINAL_REPORT

Implement Zod config schema and default config for .ai-team/config.json.

Default config:

```json
{
  "version": "0.1.0",
  "project": {
    "name": "",
    "type": "generic",
    "language": "",
    "framework": "",
    "workingDir": "."
  },
  "workflow": {
    "defaultMode": "docs-only",
    "defaultOutputLanguage": "bilingual",
    "generateTraceability": false
  },
  "commands": {
    "build": "",
    "unitTest": "",
    "integrationTest": "",
    "lint": ""
  },
  "safety": {
    "requireApprovalBeforeCode": true,
    "maxIterations": 3,
    "commandTimeoutSeconds": 900,
    "denyFiles": [".env", ".env.*", "*.pem", "*.key", "credentials.json"],
    "denyCommands": ["rm -rf /", "sudo", "chmod 777", "curl | sh", "wget | sh"]
  }
}
```

Implement:

- createRunId(requirement: string): string
- slugify(text: string): string
- nowIso(): string
- ensureDir(path): Promise<void>
- fileExists(path): Promise<boolean>

Run ID format: `run_YYYYMMDD_HHmmss_slug`

Add tests for schema and createRunId.

Acceptance criteria:
shared package builds.
tests pass.
exports are clean from src/index.ts.

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
