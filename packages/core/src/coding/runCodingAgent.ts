import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { nowIso } from "@codeclaw/shared";
import { createOpenCodeCodingAgent, getChangedFiles, generateDiff } from "@codeclaw/adapters";
import type { CodingAgentRunResult } from "@codeclaw/adapters";
import { generateOpenCodeExecutionReport } from "./opencodeExecutionReport.js";
import { createArtifactDirs } from "../artifacts/artifactWriter.js";

export interface RunCodingAgentInput {
  runId: string;
  projectRoot: string;
  prompt: string;
  adapter?: "opencode";
  dryRun?: boolean;
  timeoutMs?: number;
}

export interface RunCodingAgentOutput {
  success: boolean;
  reportPath: string;
  runResult: CodingAgentRunResult;
}

export async function runCodingAgent(input: RunCodingAgentInput): Promise<RunCodingAgentOutput> {
  const adapterId = input.adapter ?? "opencode";
  const runId = input.runId;
  const projectRoot = input.projectRoot;

  const codingAgent = createOpenCodeCodingAgent({
    command: undefined,
    timeoutMs: input.timeoutMs,
  });

  const availability = await codingAgent.checkAvailability();

  if (!availability.available) {
    const startedAt = nowIso();
    const endedAt = nowIso();
    const result: CodingAgentRunResult = {
      adapterId,
      name: "OpenCode CLI",
      success: false,
      exitCode: null,
      stdout: "",
      stderr: `OpenCode CLI is not available. ${availability.reason ?? "Check that it is installed and in PATH."}`,
      startedAt,
      endedAt,
      durationMs: 0,
      artifacts: [],
    };

    const report = generateOpenCodeExecutionReport({
      adapterName: "OpenCode CLI",
      command: "",
      workingDirectory: projectRoot,
      dryRun: input.dryRun ?? false,
      startTime: startedAt,
      endTime: endedAt,
      durationMs: 0,
      exitCode: null,
      stdoutSummary: "",
      stderrSummary: result.stderr,
      changedFiles: [],
      success: false,
      gitDiffSummary: undefined,
      nextSteps: undefined,
    });

    const paths = await createArtifactDirs(runId);
    const reportPath = join(paths.runDir, "opencode-execution-report.md");
    await mkdir(paths.runDir, { recursive: true });
    await writeFile(reportPath, report, "utf-8");

    return { success: false, reportPath, runResult: result };
  }

  const runResult = await codingAgent.run({
    runId,
    projectRoot,
    prompt: input.prompt,
    dryRun: input.dryRun ?? false,
    timeoutMs: input.timeoutMs,
    env: undefined,
  });

  let changedFiles: string[] = runResult.artifacts.filter(
    (a) => !a.endsWith(".log") && !a.endsWith(".patch"),
  );
  try {
    changedFiles = await getChangedFiles(projectRoot);
  } catch {
    // git may not be available
  }

  let gitDiff = "";
  const diffDir = join(projectRoot, ".codeclaw", ".diffs");
  const diffPatchPath = join(diffDir, `diff-${runId}.patch`);
  try {
    gitDiff = await generateDiff(projectRoot, diffPatchPath);
  } catch {
    // git may not be available
  }

  const execCommand = `opencode --prompt [implementation-prompt]`;

  const report = generateOpenCodeExecutionReport({
    adapterName: "OpenCode CLI",
    command: execCommand,
    workingDirectory: projectRoot,
    dryRun: input.dryRun ?? false,
    startTime: runResult.startedAt,
    endTime: runResult.endedAt,
    durationMs: runResult.durationMs,
    exitCode: runResult.exitCode,
    stdoutSummary: runResult.stdout,
    stderrSummary: runResult.stderr,
    changedFiles,
    success: runResult.success,
    gitDiffSummary: gitDiff.length > 0 ? gitDiff.slice(0, 3000) : undefined,
    nextSteps: runResult.success
      ? [
          "Review the changed files listed above",
          "Run build and test commands to verify changes",
          "Commit the changes if satisfied",
          "Run `codeclaw test` to execute test suite",
        ]
      : [
          "Review the error output above",
          "Check that OpenCode CLI is properly configured",
          "Verify the implementation prompt is correct",
          "Try running with --dry-run first to preview",
        ],
  });

  const paths = await createArtifactDirs(runId);
  const reportPath = join(paths.runDir, "opencode-execution-report.md");
  await mkdir(paths.runDir, { recursive: true });
  await writeFile(reportPath, report, "utf-8");

  return { success: runResult.success, reportPath, runResult };
}
