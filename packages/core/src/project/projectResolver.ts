import { access } from "node:fs/promises";
import { join } from "node:path";
import { findProject, getActiveProject, updateProjectTimestamp } from "./projectRegistry.js";

export interface ResolveResult {
  projectDir: string;
  rootPath: string;
  projectId: string | undefined;
  resolvedVia: "explicit" | "active" | "cwd";
}

export async function resolveProjectDir(projectNameOrId?: string): Promise<ResolveResult> {
  if (projectNameOrId) {
    const project = await findProject(projectNameOrId);
    if (!project) {
      throw new Error(
        `Project "${projectNameOrId}" not found. Use 'codeclaw project list' to see available projects.`,
      );
    }
    const projectDir = join(project.rootPath, ".codeclaw");
    try {
      await access(projectDir);
    } catch {
      throw new Error(
        `Project "${project.name}" exists but .codeclaw directory not found at ${projectDir}. Run 'codeclaw init' in that directory.`,
      );
    }
    await updateProjectTimestamp(projectNameOrId);
    return {
      projectDir,
      rootPath: project.rootPath,
      projectId: project.id,
      resolvedVia: "explicit",
    };
  }

  const cwdDir = join(process.cwd(), ".codeclaw");
  try {
    await access(cwdDir);
    return {
      projectDir: cwdDir,
      rootPath: process.cwd(),
      projectId: undefined,
      resolvedVia: "cwd",
    };
  } catch {
    // no .codeclaw in cwd
  }

  const active = await getActiveProject();
  if (active) {
    const projectDir = join(active.rootPath, ".codeclaw");
    try {
      await access(projectDir);
      return {
        projectDir,
        rootPath: active.rootPath,
        projectId: active.id,
        resolvedVia: "active",
      };
    } catch {
      throw new Error(
        `Active project "${active.name}" exists but .codeclaw directory not found at ${projectDir}.`,
      );
    }
  }

  throw new Error(
    "No project found. Either run 'codeclaw init' in the current directory, " +
      "add a project with 'codeclaw project add <path>', " +
      "or specify --project <name>.",
  );
}
