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
  implementationPromptPath: string;
  agentLogPath: string;
  diffPatchPath: string;
  changedFilesPath: string;
  reportDir: string;
  logsDir: string;
  traceabilityMd: string;
  traceabilityJson: string;
  snapshotDir: string;
  testResultPath: string;
  failedTestsPath: string;
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
    implementationPromptPath: join(runDir, "implementation", "implementation-prompt.md"),
    agentLogPath: join(runDir, "implementation", "agent-output.log"),
    diffPatchPath: join(runDir, "implementation", "diff.patch"),
    changedFilesPath: join(runDir, "implementation", "changed-files.json"),
    reportDir: join(runDir, "report"),
    logsDir: join(runDir, "logs"),
    traceabilityMd: join(runDir, "report", "traceability.md"),
    traceabilityJson: join(runDir, "report", "traceability.json"),
    snapshotDir: join(runDir, "snapshots"),
    testResultPath: join(runDir, "tests", "test-result.md"),
    failedTestsPath: join(runDir, "tests", "failed-tests.json"),
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
