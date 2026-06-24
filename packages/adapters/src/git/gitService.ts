import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NativeRunnerClient } from "@codeclaw/native-runner";

let nativeRunner: NativeRunnerClient | null = null;

export function resetNativeRunner(): void {
  nativeRunner = null;
}

function getRunner(): NativeRunnerClient {
  nativeRunner ??= new NativeRunnerClient();
  return nativeRunner;
}

export async function getGitStatus(
  workingDir: string,
): Promise<{ clean: boolean; branch: string }> {
  const runner = getRunner();

  const branchResponse = await runner.runCommand({
    command: "git",
    args: ["rev-parse", "--abbrev-ref", "HEAD"],
    cwd: workingDir,
    timeoutMs: 10000,
    env: undefined,
    policy: undefined,
    captureStdout: true,
    captureStderr: true,
    redactSecrets: false,
  });

  if (!branchResponse.success || !branchResponse.stdout) {
    return { clean: false, branch: "unknown" };
  }

  const branch = branchResponse.stdout.trim();

  const statusResponse = await runner.runCommand({
    command: "git",
    args: ["status", "--porcelain"],
    cwd: workingDir,
    timeoutMs: 10000,
    env: undefined,
    policy: undefined,
    captureStdout: true,
    captureStderr: true,
    redactSecrets: false,
  });

  const clean = statusResponse.success && (statusResponse.stdout ?? "").trim().length === 0;

  return { clean, branch };
}

export async function saveGitSnapshot(workingDir: string, snapshotPath: string): Promise<void> {
  await mkdir(snapshotPath, { recursive: true });

  const status = await getGitStatus(workingDir);
  const statusJson = JSON.stringify(status, null, 2);
  await writeFile(join(snapshotPath, "pre-status.json"), statusJson, "utf-8");

  const runner = getRunner();

  const stagedResult = await runner.runCommand({
    command: "git",
    args: ["diff", "--staged"],
    cwd: workingDir,
    timeoutMs: 10000,
    env: undefined,
    policy: undefined,
    captureStdout: true,
    captureStderr: true,
    redactSecrets: false,
  });
  await writeFile(join(snapshotPath, "pre-staged.diff"), stagedResult.stdout ?? "", "utf-8");

  const unstagedResult = await runner.runCommand({
    command: "git",
    args: ["diff"],
    cwd: workingDir,
    timeoutMs: 10000,
    env: undefined,
    policy: undefined,
    captureStdout: true,
    captureStderr: true,
    redactSecrets: false,
  });
  await writeFile(join(snapshotPath, "pre-unstaged.diff"), unstagedResult.stdout ?? "", "utf-8");

  const timestamp = new Date().toISOString();
  await writeFile(join(snapshotPath, "snapshot-info.json"), JSON.stringify({ timestamp }), "utf-8");
}

export async function getChangedFiles(workingDir: string): Promise<string[]> {
  const runner = getRunner();

  const unstagedResult = await runner.runCommand({
    command: "git",
    args: ["diff", "--name-only"],
    cwd: workingDir,
    timeoutMs: 10000,
    env: undefined,
    policy: undefined,
    captureStdout: true,
    captureStderr: true,
    redactSecrets: false,
  });
  const unstaged = (unstagedResult.stdout ?? "").trim().split("\n").filter(Boolean);

  const stagedResult = await runner.runCommand({
    command: "git",
    args: ["diff", "--staged", "--name-only"],
    cwd: workingDir,
    timeoutMs: 10000,
    env: undefined,
    policy: undefined,
    captureStdout: true,
    captureStderr: true,
    redactSecrets: false,
  });
  const staged = (stagedResult.stdout ?? "").trim().split("\n").filter(Boolean);

  const untrackedResult = await runner.runCommand({
    command: "git",
    args: ["ls-files", "--others", "--exclude-standard"],
    cwd: workingDir,
    timeoutMs: 10000,
    env: undefined,
    policy: undefined,
    captureStdout: true,
    captureStderr: true,
    redactSecrets: false,
  });
  const untracked = (untrackedResult.stdout ?? "").trim().split("\n").filter(Boolean);

  const allFiles = [...new Set([...unstaged, ...staged, ...untracked])];
  return allFiles;
}

export async function generateDiff(workingDir: string, outputPath: string): Promise<string> {
  await mkdir(join(outputPath, ".."), { recursive: true });

  const runner = getRunner();
  const response = await runner.runCommand({
    command: "git",
    args: ["diff", "--patch"],
    cwd: workingDir,
    timeoutMs: 30000,
    env: undefined,
    policy: undefined,
    captureStdout: true,
    captureStderr: true,
    redactSecrets: false,
  });

  const content = response.stdout ?? "";
  await writeFile(outputPath, content, "utf-8");
  return content;
}

export async function getDiffStats(
  workingDir: string,
): Promise<{ added: number; modified: number; deleted: number }> {
  const runner = getRunner();
  const response = await runner.runCommand({
    command: "git",
    args: ["diff", "--numstat"],
    cwd: workingDir,
    timeoutMs: 10000,
    env: undefined,
    policy: undefined,
    captureStdout: true,
    captureStderr: true,
    redactSecrets: false,
  });

  const lines = (response.stdout ?? "").trim().split("\n").filter(Boolean);
  let added = 0;
  let modified = 0;
  let deleted = 0;

  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length >= 3) {
      const add = Number(parts[0]);
      const del = Number(parts[1]);
      if (!Number.isNaN(add)) added += add;
      if (!Number.isNaN(del)) deleted += del;
      modified++;
    }
  }

  return { added, modified, deleted };
}

export async function generateDiffPatch(
  workingDir: string,
  outputPatchPath: string,
): Promise<
  {
    filePath: string;
    status: "added" | "modified" | "deleted" | "renamed";
    additions: number;
    deletions: number;
  }[]
> {
  const content = await generateDiff(workingDir, outputPatchPath);

  const files: {
    filePath: string;
    status: "added" | "modified" | "deleted" | "renamed";
    additions: number;
    deletions: number;
  }[] = [];

  const linePattern = /^diff --git a\/(\S+) b\/(\S+)/gm;
  let match: RegExpExecArray | null;

  while ((match = linePattern.exec(content)) !== null) {
    files.push({
      filePath: match[1] ?? match[2] ?? "",
      status: "modified",
      additions: 0,
      deletions: 0,
    });
  }

  const stats = await getDiffStats(workingDir);

  return files.length > 0
    ? files
    : [
        {
          filePath: "unknown",
          status: "modified",
          additions: stats.added,
          deletions: stats.deleted,
        },
      ];
}
