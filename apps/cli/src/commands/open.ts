import { access } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { platform } from "node:os";

function getOpenCommand(): string {
  const os = platform();
  if (os === "darwin") return "open";
  if (os === "win32") return "start";
  return "xdg-open";
}

function openBrowser(url: string): void {
  const cmd = getOpenCommand();
  try {
    execSync(`${cmd} "${url}"`, { stdio: "pipe" });
  } catch {
    console.log(`\n❌ Failed to open browser. Open manually: ${url}\n`);
  }
}

function openFileEditor(filePath: string): void {
  const editor = process.env.EDITOR ?? "vi";
  try {
    execSync(`${editor} "${filePath}"`, { stdio: "inherit" });
  } catch {
    const cmd = getOpenCommand();
    try {
      execSync(`${cmd} "${filePath}"`, { stdio: "pipe" });
    } catch {
      console.log(`\n❌ Failed to open file. Open manually: ${filePath}\n`);
    }
  }
}

function openFolder(folderPath: string): void {
  const cmd = getOpenCommand();
  try {
    execSync(`${cmd} "${folderPath}"`, { stdio: "pipe" });
  } catch {
    console.log(`\n❌ Failed to open folder. Open manually: ${folderPath}\n`);
  }
}

export function openUiCommand(): void {
  console.log("\n🌐 Opening AI Team UI...\n");
  openBrowser("http://localhost:4317");
}

export function openRunCommand(runId: string): void {
  console.log(`\n🌐 Opening run ${runId}...\n`);
  openBrowser(`http://localhost:4317/runs/${runId}`);
}

export function openReportCommand(runId: string): void {
  console.log(`\n🌐 Opening report for ${runId}...\n`);
  openBrowser(`http://localhost:4317/runs/${runId}/report`);
}

export function openDiffCommand(runId: string): void {
  console.log(`\n🌐 Opening diff for ${runId}...\n`);
  openBrowser(`http://localhost:4317/runs/${runId}/diff`);
}

export async function openConfigCommand(): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".ai-team");
  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .ai-team not found. Run 'aiteam init' first.");
    process.exit(1);
  }

  const configPath = join(aiTeamDir, "config.json");
  try {
    await access(configPath);
  } catch {
    console.log("❌ config.json not found. Run 'aiteam init' first.");
    process.exit(1);
  }

  console.log(`\n📝 Opening config.json...\n`);
  openFileEditor(configPath);
}

export async function openLogsCommand(runId: string): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".ai-team");
  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .ai-team not found. Run 'aiteam init' first.");
    process.exit(1);
  }

  const logsDir = join(aiTeamDir, "runs", runId, "logs");
  try {
    await access(logsDir);
  } catch {
    console.log(`❌ Logs directory not found for run: ${runId}`);
    process.exit(1);
  }

  console.log(`\n📂 Opening logs folder for ${runId}...\n`);
  openFolder(logsDir);
}
