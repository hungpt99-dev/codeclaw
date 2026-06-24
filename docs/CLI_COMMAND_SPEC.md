# CLI Command Spec

> Converted from: `CLI Command Spec.pdf`
> Conversion note: Content preserved from PDF extraction. No summarization or rewriting intended.

## 1. Document Overview

**Product Name**: CodeClaw

**CLI Name**: Recommended command name: `codeclaw`

Alternative command names: specforge, reqpilot, teamforge.

This document uses codeclaw as the default CLI command.

**Purpose**: This document defines the CLI commands for CodeClaw.

The CLI is the main execution interface of the product. It allows users to initialize projects, start the local web UI, create workflow runs, generate documents, coordinate AI coding agents, run tests, review results, and generate final reports.

The CLI should work without a backend cloud and without user login.

## 2. CLI Design Principles

### 2.1 Local-first

All commands should run locally.

The CLI should not require: cloud backend, login, SaaS account, online workspace.

### 2.2 Safe by default

The CLI should avoid risky actions unless the user explicitly approves.

Default behavior:

- do not auto-commit
- do not auto-push
- do not auto-merge
- do not update Jira/Slack/GitHub without approval
- do not edit protected files without approval
- do not run dangerous commands

### 2.3 Workflow-first

The CLI is not just a command wrapper for AI tools.

It should guide the full workflow:

```
raw requirement
→ clarified requirement
→ technical design
→ task breakdown
→ test matrix
→ implementation prompt
→ optional code generation
→ test
→ review
→ traceability
→ final report
```

### 2.4 Step-by-step or full-run

The CLI should support both:

Full-run mode:

```bash
codeclaw run "Thêm API export invoice CSV theo hotelId, date range, status"
```

Step-by-step mode:

```bash
codeclaw new "Thêm API export invoice CSV theo hotelId, date range, status"
codeclaw spec
codeclaw plan
codeclaw code --agent codex
codeclaw test
codeclaw review
codeclaw report
```

### 2.5 Human-readable output

CLI output should be clear and useful.

Every command should show: current step, output files created, next suggested command, errors if any, final status.

## 3. Global Command Structure

```
codeclaw <command> [arguments] [options]
```

Examples:

```bash
codeclaw init
codeclaw ui
codeclaw doctor
codeclaw run "Add password reset by email OTP"
codeclaw spec --run run_123
codeclaw plan --run run_123
codeclaw code --run run_123 --agent codex
codeclaw test --run run_123
codeclaw review --run run_123
codeclaw report --run run_123
```

## 4. Global Options

These options should be available for most commands.

```
--project <path>     Project root path. Defaults to current working directory.
--config <path>      Path to custom config file. Defaults to .codeclaw/config.json.
--run <runId>        Target run ID.
--verbose            Show detailed logs.
--json               Output machine-readable JSON.
--no-color           Disable colored terminal output.
--yes                Auto-confirm safe prompts. Must not bypass dangerous approval gates.
--dry-run            Show what would happen without executing changes.
--help               Show command help.
--version            Show CLI version.
```

## 5. Exit Codes

| Exit Code | Meaning                   |
| --------- | ------------------------- |
| 0         | Success                   |
| 1         | General error             |
| 2         | Invalid arguments         |
| 3         | Project not initialized   |
| 4         | Config error              |
| 5         | AI CLI not found          |
| 6         | AI CLI execution failed   |
| 7         | Git error                 |
| 8         | Test failed               |
| 9         | Command timeout           |
| 10        | Dangerous command blocked |
| 11        | Protected file modified   |
| 12        | Missing credential        |
| 13        | Integration failed        |
| 14        | Workflow cancelled        |
| 15        | Approval required         |

## 6. Command List

### 6.1 Project and Environment Commands

```
codeclaw init
codeclaw ui
codeclaw doctor
codeclaw config
codeclaw status
```

### 6.2 Workflow Commands

```
codeclaw new
codeclaw run
codeclaw resume
codeclaw cancel
codeclaw list
codeclaw show
```

### 6.3 Stage Commands

```
codeclaw spec
codeclaw scope
codeclaw analyze
codeclaw plan
codeclaw tasks
codeclaw tests
codeclaw code
codeclaw test
codeclaw review
codeclaw trace
codeclaw report
```

### 6.4 Artifact Commands

```
codeclaw artifacts
codeclaw open
codeclaw export
codeclaw clean
```

### 6.5 Integration Commands

```
codeclaw github
codeclaw jira
codeclaw slack
```

### 6.6 Prompt and Template Commands

```
codeclaw prompts
codeclaw templates
```

## 7. Command: codeclaw init

**Purpose**: Initialize CodeClaw in the current project.

This command creates the .codeclaw directory, default config, prompt templates, local database, and run folder structure.

**Syntax**: `codeclaw init [options]`

**Options**:

```
--type <type>              Project type. Supported: java-spring-boot, node-nestjs, react-vite, generic.
--force                    Overwrite existing .codeclaw setup.
--no-detect                Skip automatic project detection.
--output-language <lang>   Default output language. Supported: en, vi, bilingual.
```

**Examples**:

```bash
codeclaw init
codeclaw init --type java-spring-boot
codeclaw init --type java-spring-boot --output-language bilingual
```

**Actions**: The command should:

1. Detect current working directory.
2. Check if directory is a Git repository.
3. Create .codeclaw/.
4. Create .codeclaw/config.json.
5. Create .codeclaw/database.sqlite.
6. Create .codeclaw/prompts/.
7. Copy default prompt templates.
8. Create .codeclaw/runs/.
9. Detect project type if possible.
10. Suggest build/test commands.
11. Print next steps.

**Output**:

```
CodeClaw initialized.

Project: hotel-booking-service
Type: java-spring-boot
Config: .codeclaw/config.json
Prompts: .codeclaw/prompts
Runs: .codeclaw/runs

Detected:
- Build tool: Maven
- Test command: mvn test
- Build command: mvn clean package -DskipTests

Next:
1. Run: codeclaw doctor
2. Run: codeclaw ui
3. Or start with: codeclaw run "your requirement"
```

**Generated Files**:

```
.codeclaw/
  config.json
  database.sqlite
  prompts/
    ba-agent.md
    po-agent.md
    pm-agent.md
    architect-agent.md
    developer-agent.md
    qa-agent.md
    reviewer-agent.md
    security-reviewer-agent.md
    reporter-agent.md
  runs/
```

**Error Cases**:

Already initialized: "Error: Project already initialized. .codeclaw already exists. Use --force to reinitialize." Exit code: 4.

Not writable: "Error: Cannot create .codeclaw directory. Check folder permissions." Exit code: 1.

## 8. Command: codeclaw ui

**Purpose**: Start the local web UI.

The local web UI is used for settings, run history, document viewing, logs, prompt templates, integrations, and approval screens.

**Syntax**: `codeclaw ui [options]`

**Options**:

```
--port <port>    Port for local server. Default: 4317.
--host <host>    Host address. Default: 127.0.0.1.
--open           Automatically open browser.
--no-open        Do not open browser.
```

**Examples**:

```bash
codeclaw ui
codeclaw ui --port 4321 --open
```

**Actions**: The command should:

1. Load project config.
2. Start local API server.
3. Serve local web UI.
4. Print local URL.
5. Keep process running until stopped.

**Output**:

```
CodeClaw UI is running.

URL: http://localhost:4317

Press Ctrl+C to stop.
```

**Error Cases**:

Project not initialized: "Error: Project not initialized. Run: codeclaw init". Exit code: 3.

Port already in use: "Error: Port 4317 is already in use. Try: codeclaw ui --port 4321". Exit code: 1.

## 9. Command: codeclaw doctor

**Purpose**: Check whether the local environment is ready.

**Syntax**: `codeclaw doctor [options]`

**Options**:

```
--fix    Attempt safe automatic fixes.
--json   Output JSON.
```

**Examples**:

```bash
codeclaw doctor
codeclaw doctor --json
```

**Checks**: The command should check:

- Node.js installed
- Git installed
- current folder is Git repository
- .codeclaw initialized
- config valid
- SQLite accessible
- Claude Code installed
- Codex CLI installed
- Gemini CLI installed
- Aider installed
- Maven/Gradle/npm depending on project
- GitHub CLI installed if GitHub integration enabled
- Jira token available if Jira integration enabled
- Slack token available if Slack integration enabled

**Output**:

```
CodeClaw Doctor

Project
  .codeclaw initialized: OK
  Config valid: OK
  SQLite: OK

System
  Node.js: OK
  Git: OK

AI CLI
  Claude Code: OK
  Codex CLI: Not found
  Gemini CLI: OK
  Aider: Not found

Project Tools
  Maven: OK
  Gradle: Not found

Integrations
  GitHub CLI: OK
  Jira token: Missing
  Slack token: Missing

Status: READY_WITH_WARNINGS
```

**Exit Behavior**: Exit code 0 if ready. Exit code 1 if critical error. Exit code 5 if selected default AI CLI is missing. Exit code 12 if required credential is missing.

## 10. Command: codeclaw config

**Purpose**: View or modify local configuration.

**Syntax**: `codeclaw config <subcommand> [options]`

**Subcommands**:

```bash
codeclaw config get <key>
codeclaw config set <key> <value>
codeclaw config list
codeclaw config validate
codeclaw config path
```

**Examples**:

```bash
codeclaw config list
codeclaw config get agents.defaultDeveloper
codeclaw config set agents.defaultDeveloper codex
codeclaw config set commands.unitTest "mvn test"
codeclaw config validate
```

**Error Cases**:

Unknown key: "Error: Unknown config key: agents.defaultBackend". Exit code: 2.

Invalid value: "Error: Invalid value for agents.defaultDeveloper. Allowed values: claude, codex, gemini, aider". Exit code: 4.

## 11. Command: codeclaw status

**Purpose**: Show current project status and latest workflow run status.

**Syntax**: `codeclaw status [options]`

**Options**:

```
--run <runId>    Show status for a specific run.
--json           Output JSON.
```

**Examples**:

```bash
codeclaw status
codeclaw status --run run_20260622_143000
```

**Output**:

```
Project: hotel-booking-service
Type: java-spring-boot
Current branch: feature/invoice-export

Latest Run:
  ID: run_20260622_143000
  Title: Export invoice CSV
  Mode: docs-only
  Status: REPORT_GENERATED

Artifacts:
  Requirement: generated
  Design: generated
  Tasks: generated
  Tests: generated
  Report: generated
```

## 12. Command: codeclaw new

**Purpose**: Create a new workflow run from a raw requirement, but do not execute workflow stages automatically.

**Syntax**: `codeclaw new <requirement> [options]`

**Arguments**: `<requirement>` - Raw requirement text.

**Options**:

```
--title <title>              Custom run title.
--mode <mode>                Workflow mode. Supported: docs-only, assisted, semi-auto, multi-agent.
--language <language>        Input language. Supported: auto, en, vi.
--output-language <lang>     Output language. Supported: en, vi, bilingual.
```

**Examples**:

```bash
codeclaw new "Thêm chức năng reset password bằng email OTP"
codeclaw new "Add invoice CSV export" --title "Invoice CSV Export" --mode docs-only
```

**Actions**: The command should:

1. Create run ID.
2. Create run folder.
3. Save input.md.
4. Save run metadata.
5. Print next suggested command.

**Output**:

```
New run created.

Run ID: run_20260622_143000
Title: Reset password by email OTP
Mode: docs-only

Input saved:
.codeclaw/runs/run_20260622_143000/input.md

Next:
codeclaw spec --run run_20260622_143000
```

## 13. Command: codeclaw run

**Purpose**: Run a workflow from raw requirement. This is the main command for end-to-end execution.

**Syntax**: `codeclaw run <requirement> [options]`

**Arguments**: `<requirement>` - Raw requirement text.

**Options**:

```
--mode <mode>                Workflow mode. Supported: docs-only, assisted, semi-auto, multi-agent. Default: docs-only.
--agent <agent>              Selected AI coding agent. Supported: claude, codex, gemini, aider.
--title <title>              Custom run title.
--max-iterations <number>    Maximum fix iterations. Default: 3.
--no-code                    Skip code generation.
--no-test                    Skip test execution.
--no-review                  Skip review stage.
--output-language <lang>     Output language. Supported: en, vi, bilingual.
--approve                    Approve non-risky gates automatically.
--dry-run                    Show workflow plan without executing.
```

**Examples**:

```bash
codeclaw run "Thêm API export invoice CSV theo hotelId, date range, status"
codeclaw run "Add password reset by email OTP" --mode assisted
codeclaw run "Add password reset by email OTP" --mode semi-auto --agent codex
codeclaw run "Create expense approval system" --mode docs-only --output-language bilingual
```

**Docs-only Flow**: new → spec → scope → plan → tasks → tests → report

**Assisted Flow**: new → spec → scope → analyze → plan → tasks → tests → implementation prompt → report

**Semi-auto Flow**: new → spec → scope → analyze → plan → tasks → tests → approval → code → test → review → trace → report

**Output**:

```
Run started.

Run ID: run_20260622_143000
Mode: docs-only
Requirement: Add password reset by email OTP

[1/6] Generating requirement spec... OK
[2/6] Defining scope... OK
[3/6] Generating technical plan... OK
[4/6] Generating task breakdown... OK
[5/6] Generating test matrix... OK
[6/6] Generating final report... OK

Run completed.

Artifacts:
- requirement/clarified-requirement.md
- requirement/acceptance-criteria.md
- design/technical-design.md
- tasks/task-breakdown.md
- tests/test-matrix.md
- report/final-report.md

Open in UI:
codeclaw ui
```

**Error Cases**:

AI CLI missing: "Error: Selected agent 'codex' is not available. Run: codeclaw doctor". Exit code: 5.

Approval required: "Approval required before code generation. Run: codeclaw code --run run_20260622_143000 --agent codex". Exit code: 15.

## 14. Command: codeclaw resume

**Purpose**: Resume a paused, failed, or incomplete run.

**Syntax**: `codeclaw resume <runId> [options]`

**Options**:

```
--from <stage>    Resume from a specific stage. Supported: spec, scope, analyze, plan, tasks, tests, code, test, review, trace, report.
--force           Force rerun from selected stage.
```

**Examples**:

```bash
codeclaw resume run_20260622_143000
codeclaw resume run_20260622_143000 --from review
```

## 15. Command: codeclaw cancel

**Purpose**: Cancel a running or paused workflow.

**Syntax**: `codeclaw cancel <runId> [options]`

**Options**: `--reason <reason>` - Cancellation reason.

**Examples**:

```bash
codeclaw cancel run_20260622_143000
codeclaw cancel run_20260622_143000 --reason "Requirement changed"
```

## 16. Command: codeclaw list

**Purpose**: List workflow runs.

**Syntax**: `codeclaw list [options]`

**Options**:

```
--limit <number>     Number of runs to show. Default: 20.
--status <status>    Filter by status.
--mode <mode>        Filter by mode.
--json               Output JSON.
```

**Examples**:

```bash
codeclaw list
codeclaw list --status REPORT_GENERATED
```

**Output**:

```
Recent Runs

ID                              Status              Mode        Title
run_20260622_143000             REPORT_GENERATED    docs-only   Export invoice CSV
run_20260622_151200             TEST_FAILED         semi-auto   Reset password OTP
run_20260621_180500             PLAN_GENERATED      assisted    Booking cancellation approval
```

## 17. Command: codeclaw show

**Purpose**: Show details of a specific run.

**Syntax**: `codeclaw show <runId> [options]`

**Options**:

```
--artifacts    Show generated artifacts.
--logs         Show log paths.
--json         Output JSON.
```

**Examples**:

```bash
codeclaw show run_20260622_143000
codeclaw show run_20260622_143000 --artifacts
```

**Output**:

```
Run: run_20260622_143000
Title: Export invoice CSV
Mode: docs-only
Status: REPORT_GENERATED
Created: 2026-06-22 14:30

Artifacts:
- input.md
- requirement/clarified-requirement.md
- requirement/acceptance-criteria.md
- design/technical-design.md
- tasks/task-breakdown.md
- tests/test-matrix.md
- report/final-report.md
```

## 18. Command: codeclaw spec

**Purpose**: Generate clarified requirement, business rules, assumptions, open questions, and acceptance criteria.

**Syntax**: `codeclaw spec [options]`

**Options**:

```
--run <runId>                  Target run. Defaults to latest run.
--agent <agent>                Agent used for generation. Supported: claude, codex, gemini, aider.
--regenerate                   Regenerate existing spec.
--output-language <language>   Output language.
--with-questions               Emphasize clarification questions.
--assume                       Allow agent to make assumptions and continue.
```

**Examples**:

```bash
codeclaw spec
codeclaw spec --run run_20260622_143000
codeclaw spec --run run_20260622_143000 --output-language bilingual
```

**Generated Artifacts**:

```
requirement/
  clarified-requirement.md
  business-rules.md
  acceptance-criteria.md
  open-questions.md
  assumptions.md
```

## 19. Command: codeclaw scope

**Purpose**: Generate scope definition, MVP scope, out-of-scope list, priorities, and success criteria.

**Syntax**: `codeclaw scope [options]`

**Options**:

```
--run <runId>     Target run.
--regenerate      Regenerate existing scope.
--strict          Make scope smaller and more MVP-focused.
```

**Examples**:

```bash
codeclaw scope --run run_20260622_143000
codeclaw scope --run run_20260622_143000 --strict
```

**Generated Artifacts**:

```
scope/
  scope-definition.md
  out-of-scope.md
  success-criteria.md
```

## 20. Command: codeclaw analyze

**Purpose**: Analyze repository context. This is especially useful for brownfield projects.

**Syntax**: `codeclaw analyze [options]`

**Options**:

```
--run <runId>        Target run.
--path <path>        Repository path. Defaults to project root.
--deep               Perform deeper analysis.
--include <glob>     Include file pattern.
--exclude <glob>     Exclude file pattern.
--no-ai              Use only deterministic repository detection without AI summary.
```

**Examples**:

```bash
codeclaw analyze --run run_20260622_143000
codeclaw analyze --run run_20260622_143000 --deep
codeclaw analyze --include "src/main/java/**" --exclude "target/**"
```

**Generated Artifacts**:

```
design/
  repository-analysis.md
  project-summary.json
  affected-modules.md
  existing-patterns.md
```

## 21. Command: codeclaw plan

**Purpose**: Generate technical design and implementation plan.

**Syntax**: `codeclaw plan [options]`

**Options**:

```
--run <runId>       Target run.
--regenerate        Regenerate plan.
--level <level>     Planning detail level. Supported: simple, standard, detailed. Default: standard.
--stack <stack>     Specify stack manually. Example: java-spring-boot, node-nestjs, react-vite.
```

**Examples**:

```bash
codeclaw plan --run run_20260622_143000
codeclaw plan --run run_20260622_143000 --level detailed
```

**Generated Artifacts**:

```
design/
  technical-design.md
  api-design.md
  db-design.md
  service-flow.md
  risk-analysis.md
  implementation-plan.md
```

## 22. Command: codeclaw tasks

**Purpose**: Generate task breakdown.

**Syntax**: `codeclaw tasks [options]`

**Options**:

```
--run <runId>       Target run.
--format <format>   Output format. Supported: markdown, json, jira, all. Default: all.
--regenerate        Regenerate task breakdown.
```

**Examples**:

```bash
codeclaw tasks --run run_20260622_143000
codeclaw tasks --run run_20260622_143000 --format jira
```

**Generated Artifacts**:

```
tasks/
  task-breakdown.md
  task-breakdown.json
  jira-ready-tasks.md
```

## 23. Command: codeclaw tests

**Purpose**: Generate test matrix and manual test checklist. This command plans tests but does not execute tests.

**Syntax**: `codeclaw tests [options]`

**Options**:

```
--run <runId>     Target run.
--type <type>     Test planning type. Supported: unit, integration, manual, all. Default: all.
--regenerate      Regenerate test matrix.
```

**Examples**:

```bash
codeclaw tests --run run_20260622_143000
codeclaw tests --run run_20260622_143000 --type unit
```

**Generated Artifacts**:

```
tests/
  test-matrix.md
  test-matrix.json
  manual-test-checklist.md
```

## 24. Command: codeclaw code

**Purpose**: Run a selected AI coding CLI to implement the approved plan. This command should only run after the requirement, design, task breakdown, and test matrix are ready.

**Syntax**: `codeclaw code [options]`

**Options**:

```
--run <runId>              Target run.
--agent <agent>            Selected AI coding agent. Supported: claude, codex, gemini, aider.
--approve                  Approve code generation if approval is required.
--dry-run                  Generate implementation prompt but do not run AI CLI.
--timeout <seconds>        Command timeout.
--max-iterations <number>  Maximum fix iterations.
--prompt-only              Only generate implementation prompt.
```

**Examples**:

```bash
codeclaw code --run run_20260622_143000 --agent codex
codeclaw code --run run_20260622_143000 --agent claude --approve
codeclaw code --run run_20260622_143000 --prompt-only
```

**Actions**: The command should:

1. Validate run has required artifacts.
2. Generate implementation prompt if missing.
3. Ask for approval unless already approved.
4. Save Git snapshot.
5. Run selected AI CLI.
6. Stream logs.
7. Enforce timeout.
8. Collect changed files.
9. Generate diff patch.
10. Detect protected file modifications.
11. Save implementation artifacts.

**Generated Artifacts**:

```
implementation/
  implementation-prompt.md
  coding-checklist.md
  agent-output.log
  changed-files.json
  diff.patch
  implementation-notes.md
```

**Error Cases**:

Approval required: Exit code 15.

Missing AI CLI: Exit code 5.

Protected file modified: Exit code 11.

## 25. Command: codeclaw test

**Purpose**: Run configured test/build commands. This command executes tests. It is different from `codeclaw tests`, which generates test plans.

**Syntax**: `codeclaw test [options]`

**Options**:

```
--run <runId>         Target run.
--build               Run build command.
--unit                Run unit test command.
--integration         Run integration test command.
--lint                Run lint command.
--all                 Run all configured commands.
--command <command>   Run custom test command.
--timeout <seconds>   Command timeout.
```

**Examples**:

```bash
codeclaw test --run run_20260622_143000
codeclaw test --run run_20260622_143000 --all
codeclaw test --run run_20260622_143000 --command "mvn test"
```

**Generated Artifacts**:

```
tests/
  test-result.md
  failed-tests.md

logs/
  test.log
```

**Exit Behavior**: If tests fail, the command should return exit code 8, but still generate artifacts.

## 26. Command: codeclaw review

**Purpose**: Review generated code, tests, and requirement coverage.

**Syntax**: `codeclaw review [options]`

**Options**:

```
--run <runId>     Target run.
--security        Run security review.
--coverage        Run requirement coverage review.
--all             Run all review types.
--regenerate      Regenerate existing review.
```

**Examples**:

```bash
codeclaw review --run run_20260622_143000
codeclaw review --run run_20260622_143000 --all
```

**Generated Artifacts**:

```
review/
  review-report.md
  security-review.md
  requirement-coverage.md
```

## 27. Command: codeclaw trace

**Purpose**: Generate or update traceability matrix.

**Syntax**: `codeclaw trace [options]`

**Options**:

```
--run <runId>       Target run.
--regenerate        Regenerate traceability.
--format <format>   Output format. Supported: markdown, json, all. Default: all.
```

**Examples**:

```bash
codeclaw trace --run run_20260622_143000
codeclaw trace --run run_20260622_143000 --format markdown
```

**Generated Artifacts**:

```
report/
  traceability.md
  traceability.json
```

## 28. Command: codeclaw report

**Purpose**: Generate final delivery report.

**Syntax**: `codeclaw report [options]`

**Options**:

```
--run <runId>       Target run.
--regenerate        Regenerate report.
--include-logs      Include summarized logs.
--format <format>   Output format. Supported: markdown, json, html, all. Default: markdown.
```

**Examples**:

```bash
codeclaw report --run run_20260622_143000
codeclaw report --run run_20260622_143000 --format all
```

**Generated Artifacts**:

```
report/
  final-report.md
  final-report.json
  final-report.html
```

## 29. Command: codeclaw artifacts

**Purpose**: List artifacts generated for a run.

**Syntax**: `codeclaw artifacts <runId> [options]`

**Options**:

```
--type <type>    Filter by artifact type.
--json           Output JSON.
```

**Examples**:

```bash
codeclaw artifacts run_20260622_143000
codeclaw artifacts run_20260622_143000 --type design
```

## 30. Command: codeclaw open

**Purpose**: Open generated artifacts or local UI.

**Syntax**: `codeclaw open [target] [options]`

**Targets**: ui, run, report, diff, logs, config.

**Examples**:

```bash
codeclaw open ui
codeclaw open report --run run_20260622_143000
codeclaw open diff --run run_20260622_143000
codeclaw open config
```

## 31. Command: codeclaw export

**Purpose**: Export generated artifacts.

**Syntax**: `codeclaw export <runId> [options]`

**Options**:

```
--format <format>    Export format. Supported: markdown, zip, json, html.
--output <path>      Output path.
--include-logs       Include logs.
--include-diff       Include diff patch.
```

**Examples**:

```bash
codeclaw export run_20260622_143000 --format zip
codeclaw export run_20260622_143000 --format markdown --output ./delivery-docs
```

## 32. Command: codeclaw clean

**Purpose**: Clean old runs, logs, or temporary files.

**Syntax**: `codeclaw clean [options]`

**Options**:

```
--runs                  Clean old runs.
--logs                  Clean logs.
--older-than <duration> Clean items older than duration. Examples: 7d, 30d, 90d.
--dry-run               Show what would be deleted.
--yes                   Confirm deletion.
```

**Examples**:

```bash
codeclaw clean --logs --older-than 30d
codeclaw clean --runs --older-than 90d --dry-run
```

**Safety**: This command must ask for confirmation unless --yes is provided.

## 33. Command: codeclaw prompts

**Purpose**: Manage prompt templates.

**Syntax**: `codeclaw prompts <subcommand> [options]`

**Subcommands**:

```bash
codeclaw prompts list
codeclaw prompts show <name>
codeclaw prompts edit <name>
codeclaw prompts reset <name>
codeclaw prompts validate
```

**Examples**:

```bash
codeclaw prompts list
codeclaw prompts show ba-agent
codeclaw prompts edit architect-agent
codeclaw prompts reset developer-agent
```

## 34. Command: codeclaw templates

**Purpose**: Manage project templates.

**Syntax**: `codeclaw templates <subcommand> [options]`

**Subcommands**:

```bash
codeclaw templates list
codeclaw templates show <name>
codeclaw templates apply <name>
```

**Examples**:

```bash
codeclaw templates list
codeclaw templates apply java-spring-boot
```

## 35. Command: codeclaw github

**Purpose**: Manage GitHub integration. GitHub integration should be optional.

**Syntax**: `codeclaw github <subcommand> [options]`

**Subcommands**:

```bash
codeclaw github status
codeclaw github test
codeclaw github pr create
codeclaw github pr view
codeclaw github actions
```

**Examples**:

```bash
codeclaw github status
codeclaw github pr create --run run_20260622_143000
codeclaw github actions --run run_20260622_143000
```

**MVP Recommendation**: Use GitHub CLI first. The product can call: `gh auth status`, `gh pr create`, `gh pr view`, `gh run list`.

**Approval**: Creating a PR should require approval unless user explicitly passes `--approve`.

## 36. Command: codeclaw jira

**Purpose**: Manage Jira integration. Jira integration should be optional.

**Syntax**: `codeclaw jira <subcommand> [options]`

**Subcommands**:

```bash
codeclaw jira status
codeclaw jira test
codeclaw jira export
codeclaw jira create
codeclaw jira comment
```

**Examples**:

```bash
codeclaw jira status
codeclaw jira export --run run_20260622_143000
codeclaw jira create --run run_20260622_143000
codeclaw jira comment --run run_20260622_143000 --issue ABC-123
```

**MVP Behavior**: MVP should support `codeclaw jira export --run <runId>`. This generates Jira-ready markdown without calling Jira API.

**Future Behavior**: Later, the CLI can create: epic, story, subtask, comment, task link.

**Approval**: API-based Jira updates must require approval.

## 37. Command: codeclaw slack

**Purpose**: Manage Slack integration. Slack integration should be optional.

**Syntax**: `codeclaw slack <subcommand> [options]`

**Subcommands**:

```bash
codeclaw slack status
codeclaw slack test
codeclaw slack post
```

**Examples**:

```bash
codeclaw slack status
codeclaw slack test
codeclaw slack post --run run_20260622_143000
```

**MVP Behavior**: MVP should support post-only behavior: post final report summary, post PR-ready notification, post workflow result. Receiving Slack events is out of scope for MVP.

**Approval**: Posting to Slack must require approval unless user passes `--approve`.

## 38. Command: codeclaw rollback

**Purpose**: Rollback code changes generated during a run. This command is dangerous and must require confirmation.

**Syntax**: `codeclaw rollback <runId> [options]`

**Options**:

```
--dry-run    Show what would be reverted.
--yes        Confirm rollback.
```

**Examples**:

```bash
codeclaw rollback run_20260622_143000 --dry-run
codeclaw rollback run_20260622_143000 --yes
```

## 39. Command: codeclaw approve

**Purpose**: Approve a pending workflow gate from CLI.

**Syntax**: `codeclaw approve <runId> [options]`

**Options**:

```
--gate <gate>    Gate to approve. Supported: requirement, plan, code, external-update, rollback.
--note <note>    Approval note.
```

**Examples**:

```bash
codeclaw approve run_20260622_143000 --gate plan
codeclaw approve run_20260622_143000 --gate code --note "Plan looks safe"
```

## 40. Command: codeclaw reject

**Purpose**: Reject a pending workflow gate from CLI.

**Syntax**: `codeclaw reject <runId> [options]`

**Options**:

```
--gate <gate>      Gate to reject.
--reason <reason>  Rejection reason.
```

**Examples**:

```bash
codeclaw reject run_20260622_143000 --gate plan --reason "API design is too complex"
```

## 41. Command Naming Notes

### 41.1 tests vs test

The CLI should distinguish:

- `codeclaw tests` - Generates test matrix and test cases.
- `codeclaw test` - Executes configured test commands.

This distinction is important.

### 41.2 plan vs tasks

- `codeclaw plan` - Generates technical plan.
- `codeclaw tasks` - Generates task breakdown.

### 41.3 review vs report

- `codeclaw review` - Reviews code/test/coverage.
- `codeclaw report` - Summarizes final delivery.

## 42. Recommended MVP Commands

**MVP Required**:

```
codeclaw init
codeclaw ui
codeclaw doctor
codeclaw run
codeclaw new
codeclaw spec
codeclaw plan
codeclaw tasks
codeclaw tests
codeclaw report
codeclaw list
codeclaw show
```

**MVP+ Commands**:

```
codeclaw code
codeclaw test
codeclaw review
codeclaw trace
codeclaw artifacts
codeclaw open
codeclaw prompts
```

**Later Commands**:

```
codeclaw github
codeclaw jira
codeclaw slack
codeclaw rollback
codeclaw approve
codeclaw reject
codeclaw export
codeclaw clean
```

## 43. Example Full CLI Session

**Step 1: Initialize project**:

```bash
cd hotel-booking-service
codeclaw init --type java-spring-boot
```

**Step 2: Check environment**:

```bash
codeclaw doctor
```

**Step 3: Start local UI**:

```bash
codeclaw ui --open
```

**Step 4: Create docs-only run**:

```bash
codeclaw run "Thêm API export invoice CSV theo hotelId, date range, status" --mode docs-only
```

**Step 5: View run**:

```bash
codeclaw list
codeclaw show run_20260622_143000 --artifacts
```

**Step 6: Generate implementation prompt**:

```bash
codeclaw run "Thêm API export invoice CSV theo hotelId, date range, status" --mode assisted
```

**Step 7: Run coding agent**:

```bash
codeclaw code --run run_20260622_143000 --agent codex
```

**Step 8: Run tests**:

```bash
codeclaw test --run run_20260622_143000 --all
```

**Step 9: Review**:

```bash
codeclaw review --run run_20260622_143000 --all
```

**Step 10: Generate final report**:

```bash
codeclaw trace --run run_20260622_143000
codeclaw report --run run_20260622_143000
```

## 44. Final CLI Summary

The CLI should support the full local software delivery workflow:

```
init project
→ create run
→ clarify requirement
→ define scope
→ analyze repo
→ create design
→ create tasks
→ create test matrix
→ optionally run AI coding agent
→ run tests
→ review changes
→ generate traceability
→ generate final report
```

The most important commands for the first version are:

```
codeclaw init
codeclaw ui
codeclaw doctor
codeclaw run
codeclaw spec
codeclaw plan
codeclaw tasks
codeclaw tests
codeclaw report
```

The product should start with documentation and workflow commands first.

Code execution, integrations, rollback, and PR creation should come after the core workflow is stable.
