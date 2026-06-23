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
import { analyzeCommand } from "./commands/analyze.js";
import { traceCommand } from "./commands/trace.js";

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
  aiteam run "Add login page"          Run a docs-only workflow
  aiteam list                          Show recent runs
  aiteam show run_20260623_120000      Show run details
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

program.parse();
