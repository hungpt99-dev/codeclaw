import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface ArtifactPaths {
  runDir: string;
  inputFile: string;
  requirementDir: string;
  scopeDir: string;
  scopeDefinitionPath: string;
  outOfScopePath: string;
  successCriteriaPath: string;
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
  reviewDir: string;
  reviewReportPath: string;
  securityReviewPath: string;
  requirementCoveragePath: string;
  fixLoopDir: string;
  uxDir: string;
  userJourneyPath: string;
  uxDesignPath: string;
  uxCopyPath: string;
  componentBreakdownPath: string;
  frontendDesignPath: string;
  backendDesignPath: string;
  integrationPlanPath: string;
  releasePlanPath: string;
  changelogPath: string;
}

export function getArtifactPaths(runId: string): ArtifactPaths {
  const runDir = join(".ai-team", "runs", runId);
  return {
    runDir,
    inputFile: join(runDir, "input.md"),
    requirementDir: join(runDir, "requirement"),
    scopeDir: join(runDir, "scope"),
    scopeDefinitionPath: join(runDir, "scope", "product-goal.md"),
    outOfScopePath: join(runDir, "scope", "out-of-scope.md"),
    successCriteriaPath: join(runDir, "scope", "success-criteria.md"),
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
    reviewDir: join(runDir, "review"),
    reviewReportPath: join(runDir, "review", "review-report.md"),
    securityReviewPath: join(runDir, "review", "security-review.md"),
    requirementCoveragePath: join(runDir, "review", "requirement-coverage.md"),
    fixLoopDir: join(runDir, "implementation", "fix-loop"),
    uxDir: join(runDir, "ux"),
    userJourneyPath: join(runDir, "ux", "user-journey.md"),
    uxDesignPath: join(runDir, "ux", "ux-design.md"),
    uxCopyPath: join(runDir, "ux", "ux-copy.md"),
    componentBreakdownPath: join(runDir, "ux", "component-breakdown.md"),
    frontendDesignPath: join(runDir, "design", "frontend-design.md"),
    backendDesignPath: join(runDir, "design", "backend-design.md"),
    integrationPlanPath: join(runDir, "integration", "integration-plan.md"),
    releasePlanPath: join(runDir, "release", "release-plan.md"),
    changelogPath: join(runDir, "release", "changelog.md"),
  };
}

export async function createArtifactDirs(runId: string): Promise<ArtifactPaths> {
  const paths = getArtifactPaths(runId);
  await mkdir(paths.runDir, { recursive: true });
  await mkdir(paths.requirementDir, { recursive: true });
  await mkdir(paths.scopeDir, { recursive: true });
  await mkdir(paths.designDir, { recursive: true });
  await mkdir(paths.tasksDir, { recursive: true });
  await mkdir(paths.testsDir, { recursive: true });
  await mkdir(paths.implementationDir, { recursive: true });
  await mkdir(paths.reportDir, { recursive: true });
  await mkdir(paths.logsDir, { recursive: true });
  await mkdir(paths.reviewDir, { recursive: true });
  await mkdir(paths.fixLoopDir, { recursive: true });
  await mkdir(paths.uxDir, { recursive: true });
  await mkdir(join(paths.runDir, "integration"), { recursive: true });
  await mkdir(join(paths.runDir, "release"), { recursive: true });
  return paths;
}

export async function writeArtifact(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, "utf-8");
}
