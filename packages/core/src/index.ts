import { createRunId, nowIso } from "@aiteam/shared";

export function runWorkflow(name: string): { id: string; name: string; createdAt: string } {
  return { id: createRunId(name), name, createdAt: nowIso() };
}
