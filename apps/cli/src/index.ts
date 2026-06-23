#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { doctorCommand } from "./commands/doctor.js";
import { runCommand } from "./commands/run.js";
import { listCommand } from "./commands/list.js";
import { showCommand } from "./commands/show.js";
import { uiCommand } from "./commands/ui.js";
import { memoryStatusCommand, memoryIndexCommand } from "./commands/memory.js";

interface InitCliOptions {
  force?: boolean;
  type?: string;
  outputLanguage?: string;
}

interface RunCliOptions {
  title?: string;
  outputLanguage?: string;
  json?: boolean;
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
  .description("Run a docs-only workflow from a raw requirement")
  .argument("<requirement>", "Raw requirement text")
  .option("--title <title>", "Run title")
  .option("--output-language <language>", "Output language")
  .option("--json", "Output as JSON")
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

program.parse();
