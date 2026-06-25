import { access } from "node:fs/promises";
import { join } from "node:path";
import { findProject, getActiveProject, updateProjectTimestamp } from "./projectRegistry.js";
import type { ProjectContext } from "@codeclaw/shared";

export interface ResolveContextOptions {
  projectNameOrId?: string;
  cwd?: string;
}

export async function resolveProjectContext(
  options?: ResolveContextOptions,
): Promise<ProjectContext> {
  const cwd = options?.cwd ?? process.cwd();

  // 1. explicit projectId
  if (options?.projectNameOrId) {
    const project = await findProject(options.projectNameOrId);
    if (!project) {
      throw new Error(
        `Project "${options.projectNameOrId}" not found. Use 'codeclaw project list' to see available projects.`,
      );
    }
    const projectRoot = project.rootPath;
    const dataDir = join(projectRoot, ".codeclaw");
    try {
      await access(dataDir);
    } catch {
      throw new Error(
        `Project "${project.name}" exists but .codeclaw directory not found at ${dataDir}. Run 'codeclaw init' in that directory.`,
      );
    }
    if (project.id) {
      await updateProjectTimestamp(options.projectNameOrId).catch(() => undefined);
    }
    return buildContext(projectRoot, dataDir, project.id, project.name, "explicit");
  }

  // 2. active project from global registry
  const active = await getActiveProject();
  if (active) {
    const projectRoot = active.rootPath;
    const dataDir = join(projectRoot, ".codeclaw");
    try {
      await access(dataDir);
      await updateProjectTimestamp(active.id).catch(() => undefined);
      return buildContext(projectRoot, dataDir, active.id, active.name, "active");
    } catch {
      // .codeclaw missing for active project, fall through to cwd
    }
  }

  // 3. current working directory if it contains .codeclaw
  const cwdDataDir = join(cwd, ".codeclaw");
  try {
    await access(cwdDataDir);
    return buildContext(cwd, cwdDataDir, undefined, undefined, "cwd");
  } catch {
    // no .codeclaw in cwd
  }

  try {
    await access(cwdDataDir);
    return buildContext(cwd, cwdDataDir, undefined, undefined, "cwd");
  } catch {
    throw new Error(
      "No project found. Either run 'codeclaw init' in the current directory, " +
        "add a project with 'codeclaw project add <path>', " +
        "or specify --project <name>.",
    );
  }
}

export function resolveProjectContextForProject(
  projectRoot: string,
  projectId?: string,
  projectName?: string,
): ProjectContext {
  const dataDir = join(projectRoot, ".codeclaw");
  return buildContext(projectRoot, dataDir, projectId, projectName, "explicit");
}

function buildContext(
  projectRoot: string,
  dataDir: string,
  projectId: string | undefined,
  projectName: string | undefined,
  resolvedVia: ProjectContext["resolvedVia"],
): ProjectContext {
  return {
    projectId,
    projectName,
    projectRoot,
    dataDir,
    configPath: join(dataDir, "config.json"),
    databasePath: join(dataDir, "database.sqlite"),
    runsDir: join(dataDir, "runs"),
    artifactsDir: join(dataDir, "runs"),
    memoryDir: join(dataDir, "memory"),
    exportsDir: join(dataDir, "exports"),
    logsDir: join(dataDir, "logs"),
    workflowTemplatesDir: join(dataDir, "workflow-templates"),
    resolvedVia,
  };
}

export function getArtifactRunDir(dataDir: string, runId: string): string {
  return join(dataDir, "runs", runId);
}

export function createArtifactPathsForContext(
  dataDir: string,
  runId: string,
): {
  runDir: string;
  requirementDir: string;
  scopeDir: string;
  designDir: string;
  tasksDir: string;
  testsDir: string;
  implementationDir: string;
  reportDir: string;
  logsDir: string;
  reviewDir: string;
  uxDir: string;
  codingPlanDir: string;
  integrationDir: string;
  releaseDir: string;
  docsDir: string;
} {
  const runDir = getArtifactRunDir(dataDir, runId);
  return {
    runDir,
    requirementDir: join(runDir, "requirement"),
    scopeDir: join(runDir, "scope"),
    designDir: join(runDir, "design"),
    tasksDir: join(runDir, "tasks"),
    testsDir: join(runDir, "tests"),
    implementationDir: join(runDir, "implementation"),
    reportDir: join(runDir, "report"),
    logsDir: join(runDir, "logs"),
    reviewDir: join(runDir, "review"),
    uxDir: join(runDir, "ux"),
    codingPlanDir: join(runDir, "coding-plan"),
    integrationDir: join(runDir, "integration"),
    releaseDir: join(runDir, "release"),
    docsDir: join(runDir, "docs"),
  };
}
