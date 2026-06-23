import { execa } from "execa";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function getGitStatus(
  workingDir: string,
): Promise<{ clean: boolean; branch: string }> {
  const branchResult = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: workingDir,
  });
  const branch = branchResult.stdout.trim();

  const statusResult = await execa("git", ["status", "--porcelain"], { cwd: workingDir });
  const clean = statusResult.stdout.trim().length === 0;

  return { clean, branch };
}

export async function saveGitSnapshot(workingDir: string, snapshotPath: string): Promise<void> {
  await mkdir(snapshotPath, { recursive: true });

  const status = await getGitStatus(workingDir);
  const statusJson = JSON.stringify(status, null, 2);
  await writeFile(join(snapshotPath, "pre-status.json"), statusJson, "utf-8");

  try {
    const diffResult = await execa("git", ["diff", "--staged"], { cwd: workingDir });
    await writeFile(join(snapshotPath, "pre-staged.diff"), diffResult.stdout, "utf-8");
  } catch {
    await writeFile(join(snapshotPath, "pre-staged.diff"), "", "utf-8");
  }

  try {
    const unstagedResult = await execa("git", ["diff"], { cwd: workingDir });
    await writeFile(join(snapshotPath, "pre-unstaged.diff"), unstagedResult.stdout, "utf-8");
  } catch {
    await writeFile(join(snapshotPath, "pre-unstaged.diff"), "", "utf-8");
  }

  const timestamp = new Date().toISOString();
  await writeFile(join(snapshotPath, "snapshot-info.json"), JSON.stringify({ timestamp }), "utf-8");
}

export async function getChangedFiles(workingDir: string): Promise<string[]> {
  try {
    const result = await execa("git", ["diff", "--name-only"], { cwd: workingDir });
    const unstaged = result.stdout.trim().split("\n").filter(Boolean);

    const stagedResult = await execa("git", ["diff", "--staged", "--name-only"], {
      cwd: workingDir,
    });
    const staged = stagedResult.stdout.trim().split("\n").filter(Boolean);

    const untrackedResult = await execa("git", ["ls-files", "--others", "--exclude-standard"], {
      cwd: workingDir,
    });
    const untracked = untrackedResult.stdout.trim().split("\n").filter(Boolean);

    const allFiles = [...new Set([...unstaged, ...staged, ...untracked])];
    return allFiles;
  } catch {
    return [];
  }
}

export async function generateDiff(workingDir: string, outputPath: string): Promise<string> {
  await mkdir(join(outputPath, ".."), { recursive: true });

  try {
    const result = await execa("git", ["diff", "--patch"], { cwd: workingDir });
    const content = result.stdout;
    await writeFile(outputPath, content, "utf-8");
    return content;
  } catch {
    await writeFile(outputPath, "", "utf-8");
    return "";
  }
}

export async function getDiffStats(
  workingDir: string,
): Promise<{ added: number; modified: number; deleted: number }> {
  try {
    const result = await execa("git", ["diff", "--numstat"], { cwd: workingDir });
    const lines = result.stdout.trim().split("\n").filter(Boolean);

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
  } catch {
    return { added: 0, modified: 0, deleted: 0 };
  }
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
