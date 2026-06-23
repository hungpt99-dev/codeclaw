import { generateDiffPatch } from "../git/gitService.js";

export interface DiffFile {
  filePath: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
}

export async function generateDiffPatchFiles(
  workingDir: string,
  outputPatchPath: string,
): Promise<DiffFile[]> {
  return generateDiffPatch(workingDir, outputPatchPath);
}
