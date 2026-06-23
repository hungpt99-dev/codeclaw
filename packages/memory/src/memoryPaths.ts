import { join } from "node:path";

export function getAiTeamDir(projectRoot: string): string {
  return join(projectRoot, ".ai-team");
}

export function getMemoryDir(projectRoot: string): string {
  return join(getAiTeamDir(projectRoot), "memory");
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
  return join(getAiTeamDir(projectRoot), "runs");
}

export function getDatabasePath(projectRoot: string): string {
  return join(getAiTeamDir(projectRoot), "database.sqlite");
}
