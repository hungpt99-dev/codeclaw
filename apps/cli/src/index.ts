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

program.name("aiteam").description("Local AI Software Team CLI").version("0.0.0");

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
  .description("Show recent runs")
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
  .description("Start or show info about the web UI")
  .action(() => {
    uiCommand();
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
