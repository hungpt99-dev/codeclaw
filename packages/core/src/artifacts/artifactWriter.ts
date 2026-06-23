import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface ArtifactPaths {
  runDir: string;
  inputFile: string;
  requirementDir: string;
  designDir: string;
  tasksDir: string;
  testsDir: string;
  implementationDir: string;
  reportDir: string;
  logsDir: string;
}

export function getArtifactPaths(runId: string): ArtifactPaths {
  const runDir = join(".ai-team", "runs", runId);
  return {
    runDir,
    inputFile: join(runDir, "input.md"),
    requirementDir: join(runDir, "requirement"),
    designDir: join(runDir, "design"),
    tasksDir: join(runDir, "tasks"),
    testsDir: join(runDir, "tests"),
    implementationDir: join(runDir, "implementation"),
    reportDir: join(runDir, "report"),
    logsDir: join(runDir, "logs"),
  };
}

export async function createArtifactDirs(runId: string): Promise<ArtifactPaths> {
  const paths = getArtifactPaths(runId);
  await mkdir(paths.runDir, { recursive: true });
  await mkdir(paths.requirementDir, { recursive: true });
  await mkdir(paths.designDir, { recursive: true });
  await mkdir(paths.tasksDir, { recursive: true });
  await mkdir(paths.testsDir, { recursive: true });
  await mkdir(paths.implementationDir, { recursive: true });
  await mkdir(paths.reportDir, { recursive: true });
  await mkdir(paths.logsDir, { recursive: true });
  return paths;
}

export async function writeArtifact(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, "utf-8");
}
