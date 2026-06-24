import { EventEmitter } from "node:events";
import type { WorkflowProgressEvent, WorkflowProgressEventType } from "@aiteam/shared";

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

const eventHistory = new Map<string, WorkflowProgressEvent[]>();
const MAX_HISTORY = 200;

export function getWorkflowEmitter(): EventEmitter {
  return emitter;
}

export function getEventHistory(runId: string): WorkflowProgressEvent[] {
  return eventHistory.get(runId) ?? [];
}

export function emitWorkflowProgress(
  runId: string,
  type: WorkflowProgressEventType,
  data: Omit<WorkflowProgressEvent, "runId" | "type" | "timestamp">,
): void {
  const event: WorkflowProgressEvent = {
    runId,
    type,
    timestamp: new Date().toISOString(),
    ...data,
  };

  const history = eventHistory.get(runId) ?? [];
  history.push(event);
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
  eventHistory.set(runId, history);

  emitter.emit(`progress:${runId}`, event);
}

export function clearEventHistory(runId: string): void {
  eventHistory.delete(runId);
}
