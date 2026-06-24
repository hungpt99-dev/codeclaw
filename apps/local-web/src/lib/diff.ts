import { parse, html } from "diff2html";

export interface DiffFileInfo {
  filePath: string;
  oldPath: string | undefined;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  isRisky: boolean;
  language: string;
}

export interface DiffStatsInfo {
  filesChanged: number;
  additions: number;
  deletions: number;
}

export function parseDiffContent(diffContent: string, warnFiles?: string[]): DiffFileInfo[] {
  const files = parse(diffContent, { drawFileList: false, outputFormat: "line-by-line" });

  return files
    .filter((f) => !f.isBinary)
    .map((f) => ({
      filePath: f.newName || f.oldName,
      oldPath: f.oldName !== f.newName ? f.oldName : undefined,
      status: f.isNew
        ? ("added" as const)
        : f.isDeleted
          ? ("deleted" as const)
          : f.isRename
            ? ("renamed" as const)
            : ("modified" as const),
      additions: f.addedLines,
      deletions: f.deletedLines,
      isRisky: warnFiles
        ? warnFiles.some(
            (w) =>
              (f.newName || f.oldName).includes(w.replace(/^\.?\//, "")) ||
              (f.newName || f.oldName).includes(w),
          )
        : false,
      language: f.language,
    }));
}

export function computeStats(files: DiffFileInfo[]): DiffStatsInfo {
  return {
    filesChanged: files.length,
    additions: files.reduce((sum, f) => sum + f.additions, 0),
    deletions: files.reduce((sum, f) => sum + f.deletions, 0),
  };
}

export function renderFileDiffHtml(
  diffContent: string,
  filePath: string,
  outputFormat: "line-by-line" | "side-by-side" = "line-by-line",
): string {
  const files = parse(diffContent, { drawFileList: false, outputFormat });
  const file = files.find((f) => (f.newName || f.oldName) === filePath);
  if (!file) return "";
  return html([file], {
    drawFileList: false,
    outputFormat,
  });
}
