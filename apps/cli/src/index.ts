#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { doctorCommand } from "./commands/doctor.js";
import { runCommand } from "./commands/run.js";
import { listCommand } from "./commands/list.js";
import { showCommand } from "./commands/show.js";
import { uiCommand } from "./commands/ui.js";
import { memoryStatusCommand, memoryIndexCommand } from "./commands/memory.js";
import { approveCommand } from "./commands/approve.js";
import { rejectCommand } from "./commands/reject.js";
import { resumeCommand } from "./commands/resume.js";
import { cancelCommand } from "./commands/cancel.js";
import { scopeCommand } from "./commands/scope.js";
import { analyzeCommand } from "./commands/analyze.js";
import { traceCommand } from "./commands/trace.js";
import { exportCommand } from "./commands/export.js";
import { testCommand } from "./commands/test.js";
import { reviewCommand } from "./commands/review.js";
import { specCommand } from "./commands/spec.js";
import { planCommand } from "./commands/plan.js";
import { tasksCommand } from "./commands/tasks.js";
import { testsPlanCommand } from "./commands/tests-plan.js";
import { codeCommand } from "./commands/code.js";
import { reportCommand } from "./commands/report.js";
import { newCommand } from "./commands/new.js";
import {
  githubStatusCommand,
  githubTestCommand,
  githubPRCommand,
  githubActionsCommand,
} from "./commands/github.js";
import {
  jiraStatusCommand,
  jiraTestCommand,
  jiraExportCommand,
  jiraCreateCommand,
  jiraCommentCommand,
} from "./commands/jira.js";
import { slackStatusCommand, slackTestCommand, slackPostCommand } from "./commands/slack.js";
import {
  configListCommand,
  configGetCommand,
  configSetCommand,
  configValidateCommand,
  configPathCommand,
} from "./commands/config.js";
import { statusCommand } from "./commands/status.js";
import {
  promptsListCommand,
  promptsShowCommand,
  promptsEditCommand,
  promptsResetCommand,
  promptsValidateCommand,
} from "./commands/prompts.js";
import { artifactsCommand } from "./commands/artifacts.js";
import {
  openUiCommand,
  openRunCommand,
  openReportCommand,
  openDiffCommand,
  openConfigCommand,
  openLogsCommand,
} from "./commands/open.js";
import { cleanCommand } from "./commands/clean.js";
import { rollbackCommand } from "./commands/rollback.js";

interface InitCliOptions {
  force?: boolean;
  type?: string;
  outputLanguage?: string;
}

interface RunCliOptions {
  title?: string;
  mode?: string;
  outputLanguage?: string;
  json?: boolean;
  approve?: boolean;
  agent?: string;
  timeout?: string;
}

interface ApproveCliOptions {
  gate?: string;
  note?: string;
}

interface RejectCliOptions {
  gate?: string;
  reason?: string;
}

interface CancelCliOptions {
  reason?: string;
}

interface TestCliOptions {
  run: string;
  build?: boolean;
  unit?: boolean;
  integration?: boolean;
  lint?: boolean;
  all?: boolean;
  command?: string;
}

const program = new Command();

program
  .name("codeclaw")
  .description(
    "CodeClaw — a local-first AI software team — generate structured software artifacts from a raw requirement",
  )
  .version("0.0.0")
  .addHelpText(
    "after",
    `
Examples:
  codeclaw init                          Initialize .codeclaw in the current directory
  codeclaw doctor                        Check configuration
  codeclaw new "Add login page"          Create a new run without executing stages
  codeclaw run "Add login page"          Run a full workflow
  codeclaw spec --run <runId>            Generate requirement specification
  codeclaw scope --run <runId>           Generate scope definition
  codeclaw plan --run <runId>            Generate technical design
  codeclaw tasks --run <runId>           Generate task breakdown
  codeclaw tests --run <runId>           Generate test matrix (plan)
  codeclaw code --run <runId>            Generate implementation prompt
  codeclaw report --run <runId>          Generate final report
  codeclaw list                          Show recent runs
  codeclaw show <runId>                  Show run details
  codeclaw ui --open                     Start the local web UI
  codeclaw approve <runId> --gate PLAN   Approve a pending gate
  codeclaw reject <runId> --gate PLAN    Reject a pending gate
  codeclaw resume <runId>                Resume a paused workflow
  codeclaw cancel <runId>                Cancel a workflow run
  codeclaw memory status                 Show runtime memory status
  codeclaw config list                    Show all config
  codeclaw config get <key>              Get specific config key
  codeclaw config set <key> <value>      Set config key
  codeclaw config validate               Validate config.json
  codeclaw config path                   Show config file path
  codeclaw status                        Project status overview
  codeclaw status --run <runId>          Detailed status for a run
  codeclaw status --json                 JSON output
  codeclaw prompts list                  List prompt templates
  codeclaw prompts show <name>           Show template content
  codeclaw prompts edit <name>           Edit template in $EDITOR
  codeclaw prompts reset <name>          Reset template to default
  codeclaw prompts validate              Validate all templates
  codeclaw artifacts <runId>             List run artifacts
  codeclaw artifacts <runId> --type <t>  Filter artifacts by type
  codeclaw artifacts <runId> --json      JSON output
  codeclaw open ui                       Open browser UI
  codeclaw open run <runId>              Open run in browser
  codeclaw open report <runId>           Open final report
  codeclaw open diff <runId>             Open diff
  codeclaw open config                   Open config.json in editor
  codeclaw open logs <runId>             Open logs folder
  codeclaw clean --runs --older-than 30d Clean old runs
  codeclaw clean --all --older-than 90d  Clean everything
  codeclaw clean --dry-run               Preview without deleting
  codeclaw rollback <runId>              Rollback code changes
  codeclaw rollback <runId> --dry-run    Preview changes
`,
  );

program
  .command("init")
  .description("Initialize .codeclaw in the current directory")
  .option("--force", "Overwrite existing .codeclaw directory")
  .option("--type <type>", "Project type (e.g. web, mobile, cli)")
  .option("--output-language <language>", "Default output language")
  .action(async (options: InitCliOptions) => {
    await initCommand(options);
  });

program
  .command("doctor")
  .description("Check that .codeclaw is properly configured")
  .action(async () => {
    await doctorCommand();
  });

program
  .command("run")
  .description("Run a workflow from a raw requirement")
  .argument("<requirement>", "Raw requirement text")
  .option("--mode <mode>", "Workflow mode (docs-only, assisted)", "docs-only")
  .option("--title <title>", "Run title")
  .option("--output-language <language>", "Output language")
  .option("--json", "Output as JSON")
  .option("--approve", "Auto-approve non-risky gates")
  .option("--agent <name>", "Selected AI coding agent (claude, codex, gemini, aider)")
  .option("--timeout <seconds>", "Override command timeout in seconds")
  .action(async (requirement: string, options: RunCliOptions) => {
    await runCommand(requirement, options);
  });

program
  .command("list")
  .description("Show recent runs (up to 20)")
  .action(async () => {
    await listCommand();
  });

program
  .command("show")
  .description("Show run details")
  .argument("<runId>", "Run ID to show")
  .action(async (runId: string) => {
    await showCommand(runId);
  });

program
  .command("ui")
  .description("Start the local web UI server")
  .option("--host <host>", "Server host", "127.0.0.1")
  .option("--port <port>", "Server port", "4317")
  .option("--open", "Open browser on start")
  .action(async (options: { host?: string; port?: string; open?: boolean }) => {
    await uiCommand(options);
  });

const memoryProgram = program.command("memory").description("Manage runtime memory");

memoryProgram
  .command("status")
  .description("Show runtime memory status")
  .action(async () => {
    await memoryStatusCommand();
  });

memoryProgram
  .command("index")
  .description("Re-index runtime memory files into SQLite")
  .action(async () => {
    await memoryIndexCommand();
  });

program
  .command("approve")
  .description("Approve a pending workflow gate")
  .argument("<runId>", "Run ID")
  .option("--gate <gate>", "Gate to approve (REQUIREMENT, PLAN, ...)")
  .option("--note <note>", "Approval note")
  .action(async (runId: string, options: ApproveCliOptions) => {
    await approveCommand(runId, options);
  });

program
  .command("reject")
  .description("Reject a pending workflow gate")
  .argument("<runId>", "Run ID")
  .option("--gate <gate>", "Gate to reject (REQUIREMENT, PLAN, ...)")
  .option("--reason <reason>", "Rejection reason")
  .action(async (runId: string, options: RejectCliOptions) => {
    await rejectCommand(runId, options);
  });

program
  .command("resume")
  .description("Resume a paused workflow run")
  .argument("<runId>", "Run ID")
  .action(async (runId: string) => {
    await resumeCommand(runId);
  });

program
  .command("cancel")
  .description("Cancel a running or paused workflow run")
  .argument("<runId>", "Run ID")
  .option("--reason <reason>", "Cancellation reason")
  .action(async (runId: string, options: CancelCliOptions) => {
    await cancelCommand(runId, options);
  });

program
  .command("scope")
  .description("Generate scope definition for a run")
  .requiredOption("--run <runId>", "Run ID")
  .option("--strict", "Require scope approval before proceeding")
  .option("--regenerate", "Regenerate scope artifacts")
  .action(async (options: { run: string; strict?: boolean; regenerate?: boolean }) => {
    await scopeCommand(options);
  });

program
  .command("analyze")
  .description("Analyze repository context (language, framework, build tool, etc.)")
  .option("--run <runId>", "Save analysis to existing run's design dir")
  .option("--json", "Output as JSON")
  .option("--include <glob>", "Include file pattern")
  .option("--exclude <glob>", "Exclude file pattern")
  .action(async (options: { run?: string; json?: boolean; include?: string; exclude?: string }) => {
    await analyzeCommand(options);
  });

program
  .command("trace")
  .description("Generate or show traceability matrix for a run")
  .requiredOption("--run <runId>", "Run ID")
  .option("--format <format>", "Output format: markdown, json, all", "all")
  .option("--regenerate", "Regenerate traceability from artifacts")
  .option("--ai", "Use AI enhancement for coverage analysis and recommendations")
  .action(async (options: { run: string; format?: string; regenerate?: boolean; ai?: boolean }) => {
    await traceCommand(options);
  });

program
  .command("test")
  .description("Run configured test/build commands")
  .requiredOption("--run <runId>", "Target run ID")
  .option("--build", "Run build command only")
  .option("--unit", "Run unit test command only")
  .option("--integration", "Run integration test command only")
  .option("--lint", "Run lint command only")
  .option("--all", "Run all configured commands")
  .option("--command <cmd>", "Run custom command")
  .action(async (options: TestCliOptions) => {
    await testCommand(options);
  });

program
  .command("review")
  .description("Run code review on implementation artifacts")
  .requiredOption("--run <runId>", "Target run ID")
  .option("--code", "Run code review only")
  .option("--security", "Run security review only")
  .option("--coverage", "Run requirement coverage review only")
  .option("--all", "Run all review types (default)")
  .option("--regenerate", "Regenerate existing review")
  .action(
    async (options: {
      run: string;
      code?: boolean;
      security?: boolean;
      coverage?: boolean;
      all?: boolean;
      regenerate?: boolean;
    }) => {
      await reviewCommand(options);
    },
  );

program
  .command("spec")
  .description("Generate requirement specification for a run (BA Agent)")
  .requiredOption("--run <runId>", "Run ID")
  .option("--regenerate", "Regenerate requirement artifacts")
  .option("--output-language <lang>", "Output language")
  .action(async (options: { run: string; regenerate?: boolean; outputLanguage?: string }) => {
    await specCommand(options);
  });

program
  .command("plan")
  .description("Generate technical design for a run (Architect Agent)")
  .requiredOption("--run <runId>", "Run ID")
  .option("--regenerate", "Regenerate design artifacts")
  .option("--level <level>", "Detail level: simple, standard, detailed")
  .action(async (options: { run: string; regenerate?: boolean; level?: string }) => {
    await planCommand(options);
  });

program
  .command("tasks")
  .description("Generate task breakdown for a run (PM Agent)")
  .requiredOption("--run <runId>", "Run ID")
  .option("--regenerate", "Regenerate task breakdown")
  .option("--format <format>", "Output format: markdown, json, jira", "markdown")
  .action(async (options: { run: string; regenerate?: boolean; format?: string }) => {
    await tasksCommand(options);
  });

program
  .command("tests")
  .description("Generate test matrix for a run (QA Agent, plan only)")
  .requiredOption("--run <runId>", "Run ID")
  .option("--regenerate", "Regenerate test matrix")
  .option("--type <type>", "Test type: unit, integration, manual, all", "all")
  .action(async (options: { run: string; regenerate?: boolean; type?: string }) => {
    await testsPlanCommand(options);
  });

program
  .command("code")
  .description("Generate implementation prompt or run code (Developer Agent)")
  .requiredOption("--run <runId>", "Run ID")
  .option("--agent <name>", "AI coding agent (claude, codex, gemini, aider)")
  .option("--prompt-only", "Generate prompt only, do not execute")
  .option("--approve", "Auto-approve gates")
  .option("--dry-run", "Show what would happen without executing")
  .action(
    async (options: {
      run: string;
      agent?: string;
      promptOnly?: boolean;
      approve?: boolean;
      dryRun?: boolean;
    }) => {
      await codeCommand(options);
    },
  );

program
  .command("report")
  .description("Generate final report for a run (Reporter Agent)")
  .requiredOption("--run <runId>", "Run ID")
  .option("--regenerate", "Regenerate report")
  .option("--include-logs", "Include log files in report")
  .option("--format <format>", "Output format: markdown, json", "markdown")
  .action(
    async (options: {
      run: string;
      regenerate?: boolean;
      includeLogs?: boolean;
      format?: string;
    }) => {
      await reportCommand(options);
    },
  );

program
  .command("new")
  .description("Create a new run without executing stages")
  .argument("<requirement>", "Raw requirement text")
  .option("--title <title>", "Run title")
  .option("--mode <mode>", "Workflow mode (docs-only, assisted, semi-auto)", "docs-only")
  .action(async (requirement: string, options: { title?: string; mode?: string }) => {
    await newCommand(requirement, options);
  });

const githubProgram = program.command("github").description("GitHub integration (optional)");

githubProgram
  .command("status")
  .description("Check gh CLI availability and auth status")
  .action(async () => {
    await githubStatusCommand();
  });

githubProgram
  .command("test")
  .description("Test GitHub connection")
  .action(async () => {
    await githubTestCommand();
  });

githubProgram
  .command("pr")
  .description("Manage pull requests")
  .argument("<action>", "create or view")
  .option("--run <runId>", "Run ID")
  .option("--approve", "Skip approval prompt")
  .action(async (action: string, options: { run?: string; approve?: boolean }) => {
    const ghOpts: { run?: string; approve?: boolean } = {};
    if (options.run !== undefined) ghOpts.run = options.run;
    if (options.approve !== undefined) ghOpts.approve = options.approve;
    await githubPRCommand(action, ghOpts);
  });

githubProgram
  .command("actions")
  .description("Read CI/CD status")
  .action(async () => {
    await githubActionsCommand();
  });

const jiraProgram = program.command("jira").description("Jira integration (optional)");

jiraProgram
  .command("status")
  .description("Check Jira integration status")
  .action(() => {
    jiraStatusCommand();
  });

jiraProgram
  .command("test")
  .description("Test Jira API connection")
  .action(async () => {
    await jiraTestCommand();
  });

jiraProgram
  .command("export")
  .description("Generate Jira-ready markdown from run artifacts")
  .option("--run <runId>", "Run ID")
  .action((options: { run?: string }) => {
    jiraExportCommand(options);
  });

jiraProgram
  .command("create")
  .description("Create Jira issues from run artifacts")
  .option("--run <runId>", "Run ID")
  .option("--approve", "Skip approval prompt")
  .action(async (options: { run?: string; approve?: boolean }) => {
    await jiraCreateCommand(options);
  });

jiraProgram
  .command("comment")
  .description("Add comment to Jira issue with run summary")
  .option("--run <runId>", "Run ID")
  .option("--issue <issueKey>", "Jira issue key")
  .option("--approve", "Skip approval prompt")
  .action(async (options: { run?: string; issue?: string; approve?: boolean }) => {
    await jiraCommentCommand(options);
  });

const slackProgram = program.command("slack").description("Slack integration (optional)");

slackProgram
  .command("status")
  .description("Check Slack integration status")
  .action(() => {
    slackStatusCommand();
  });

slackProgram
  .command("test")
  .description("Test Slack API connection")
  .action(async () => {
    await slackTestCommand();
  });

slackProgram
  .command("post")
  .description("Post a message to Slack")
  .option("--run <runId>", "Run ID")
  .option("--event <event>", "Event type (report_ready, docs_generated, etc.)", "report_ready")
  .option("--approve", "Skip approval prompt")
  .action(async (options: { run?: string; event?: string; approve?: boolean }) => {
    await slackPostCommand(options);
  });

program
  .command("export")
  .description("Export run artifacts to various formats")
  .argument("<runId>", "Run ID")
  .option("--format <format>", "Output format (markdown, html, docx, pdf, zip)", "markdown")
  .option("--output <path>", "Output path")
  .option("--include-logs", "Include log files")
  .option("--include-diff", "Include diff patch")
  .option("--title <title>", "Document title")
  .option("--author <author>", "Document author")
  .action(
    async (
      runId: string,
      options: {
        format?: string;
        output?: string;
        includeLogs?: boolean;
        includeDiff?: boolean;
        title?: string;
        author?: string;
      },
    ) => {
      await exportCommand(runId, options);
    },
  );

const configProgram = program.command("config").description("Manage configuration");

configProgram
  .command("list")
  .description("Show all configuration values")
  .action(async () => {
    await configListCommand();
  });

configProgram
  .command("get")
  .description("Get a specific config key (dot notation)")
  .argument("<key>", "Config key (e.g. project.name)")
  .action(async (key: string) => {
    await configGetCommand(key);
  });

configProgram
  .command("set")
  .description("Set a config key (dot notation)")
  .argument("<key>", "Config key (e.g. project.name)")
  .argument("<value>", "Config value")
  .action(async (key: string, value: string) => {
    await configSetCommand(key, value);
  });

configProgram
  .command("validate")
  .description("Validate configuration against schema")
  .action(async () => {
    await configValidateCommand();
  });

configProgram
  .command("path")
  .description("Show config file path")
  .action(async () => {
    await configPathCommand();
  });

program
  .command("status")
  .description("Show project status overview")
  .option("--run <runId>", "Show detailed status for a specific run")
  .option("--json", "Output as JSON")
  .action(async (options: { run?: string; json?: boolean }) => {
    await statusCommand(options);
  });

const promptsProgram = program.command("prompts").description("Manage prompt templates");

promptsProgram
  .command("list")
  .description("List available prompt templates")
  .action(async () => {
    await promptsListCommand();
  });

promptsProgram
  .command("show")
  .description("Show prompt template content")
  .argument("<name>", "Template name (without .md extension)")
  .action(async (name: string) => {
    await promptsShowCommand(name);
  });

promptsProgram
  .command("edit")
  .description("Open prompt template in default editor")
  .argument("<name>", "Template name (without .md extension)")
  .action(async (name: string) => {
    await promptsEditCommand(name);
  });

promptsProgram
  .command("reset")
  .description("Reset prompt template to default")
  .argument("<name>", "Template name (without .md extension)")
  .action(async (name: string) => {
    await promptsResetCommand(name);
  });

promptsProgram
  .command("validate")
  .description("Validate all prompt templates for correct variables")
  .action(async () => {
    await promptsValidateCommand();
  });

program
  .command("artifacts")
  .description("List artifacts for a run")
  .argument("<runId>", "Run ID")
  .option("--type <type>", "Filter by artifact type (e.g. design, report)")
  .option("--json", "Output as JSON")
  .action(async (runId: string, options: { type?: string; json?: boolean }) => {
    await artifactsCommand(runId, options);
  });

const openProgram = program.command("open").description("Open files and UI");

openProgram
  .command("ui")
  .description("Open browser to localhost:4317")
  .action(() => {
    openUiCommand();
  });

openProgram
  .command("run")
  .description("Open run in browser")
  .argument("<runId>", "Run ID")
  .action((runId: string) => {
    openRunCommand(runId);
  });

openProgram
  .command("report")
  .description("Open final report in browser")
  .argument("<runId>", "Run ID")
  .action((runId: string) => {
    openReportCommand(runId);
  });

openProgram
  .command("diff")
  .description("Open diff in browser")
  .argument("<runId>", "Run ID")
  .action((runId: string) => {
    openDiffCommand(runId);
  });

openProgram
  .command("config")
  .description("Open config.json in editor")
  .action(async () => {
    await openConfigCommand();
  });

openProgram
  .command("logs")
  .description("Open logs folder")
  .argument("<runId>", "Run ID")
  .action(async (runId: string) => {
    await openLogsCommand(runId);
  });

program
  .command("clean")
  .description("Clean old runs and logs")
  .option("--runs", "Clean old run directories")
  .option("--logs", "Clean old log directories")
  .option("--all", "Clean everything")
  .option("--older-than <days>", 'Age threshold (e.g. "30d")')
  .option("--dry-run", "Preview without deleting")
  .option("--yes", "Skip confirmation prompt")
  .action(
    async (options: {
      runs?: boolean;
      logs?: boolean;
      all?: boolean;
      olderThan?: string;
      dryRun?: boolean;
      yes?: boolean;
    }) => {
      await cleanCommand(options);
    },
  );

program
  .command("rollback")
  .description("Rollback code changes for a run")
  .argument("<runId>", "Run ID")
  .option("--dry-run", "Preview changes without applying")
  .option("--yes", "Skip confirmation prompt")
  .action(async (runId: string, options: { dryRun?: boolean; yes?: boolean }) => {
    await rollbackCommand(runId, options);
  });

program.parse();
