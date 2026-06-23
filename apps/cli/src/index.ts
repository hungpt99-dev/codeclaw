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
  .name("aiteam")
  .description(
    "Local AI Software Team — generate structured software artifacts from a raw requirement",
  )
  .version("0.0.0")
  .addHelpText(
    "after",
    `
Examples:
  aiteam init                          Initialize .ai-team in the current directory
  aiteam doctor                        Check configuration
  aiteam new "Add login page"          Create a new run without executing stages
  aiteam run "Add login page"          Run a full workflow
  aiteam spec --run <runId>            Generate requirement specification
  aiteam scope --run <runId>           Generate scope definition
  aiteam plan --run <runId>            Generate technical design
  aiteam tasks --run <runId>           Generate task breakdown
  aiteam tests --run <runId>           Generate test matrix (plan)
  aiteam code --run <runId>            Generate implementation prompt
  aiteam report --run <runId>          Generate final report
  aiteam list                          Show recent runs
  aiteam show <runId>                  Show run details
  aiteam ui --open                     Start the local web UI
  aiteam approve <runId> --gate PLAN   Approve a pending gate
  aiteam reject <runId> --gate PLAN    Reject a pending gate
  aiteam resume <runId>                Resume a paused workflow
  aiteam cancel <runId>                Cancel a workflow run
  aiteam memory status                 Show runtime memory status
`,
  );

program
  .command("init")
  .description("Initialize .ai-team in the current directory")
  .option("--force", "Overwrite existing .ai-team directory")
  .option("--type <type>", "Project type (e.g. web, mobile, cli)")
  .option("--output-language <language>", "Default output language")
  .action(async (options: InitCliOptions) => {
    await initCommand(options);
  });

program
  .command("doctor")
  .description("Check that .ai-team is properly configured")
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
  .action(async (options: { run: string; format?: string; regenerate?: boolean }) => {
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
  .option("--security", "Run security review only")
  .option("--coverage", "Run requirement coverage review only")
  .option("--all", "Run all review types (default)")
  .option("--regenerate", "Regenerate existing review")
  .action(
    async (options: {
      run: string;
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

program.parse();
