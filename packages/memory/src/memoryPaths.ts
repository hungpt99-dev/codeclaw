import { join } from "node:path";

export function getCodeClawDir(projectRoot: string): string {
  return join(projectRoot, ".codeclaw");
}

export function getMemoryDir(projectRoot: string): string {
  return join(getCodeClawDir(projectRoot), "memory");
}

export function getProjectMemoryDir(projectRoot: string): string {
  return join(getMemoryDir(projectRoot), "project");
}

export function getDecisionMemoryDir(projectRoot: string): string {
  return join(getMemoryDir(projectRoot), "decisions");
}

export function getAgentMemoryDir(projectRoot: string): string {
  return join(getMemoryDir(projectRoot), "agents");
}

export function getIndexesDir(projectRoot: string): string {
  return join(getMemoryDir(projectRoot), "indexes");
}

export function getRunsDir(projectRoot: string): string {
  return join(getCodeClawDir(projectRoot), "runs");
}

export function getDatabasePath(projectRoot: string): string {
  return join(getCodeClawDir(projectRoot), "database.sqlite");
}
