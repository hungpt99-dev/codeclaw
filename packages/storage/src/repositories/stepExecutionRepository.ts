import { nowIso } from "@codeclaw/shared";
import type { StepStatus, StepExecution } from "@codeclaw/shared";
import type { DbConnection } from "../db.js";

interface StepExecutionRow {
  id: string;
  run_id: string;
  step_index: number;
  step_name: string;
  agent_role: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  output_artifact_path: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRecord(row: StepExecutionRow): StepExecution {
  return {
    id: row.id,
    runId: row.run_id,
    stepIndex: row.step_index,
    stepName: row.step_name,
    agentRole: row.agent_role,
    status: row.status as StepStatus,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
    errorMessage: row.error_message,
    outputArtifactPath: row.output_artifact_path,
  };
}

export interface CreateStepExecutionInput {
  id: string;
  runId: string;
  stepIndex: number;
  stepName: string;
  agentRole: string | null;
}

export function createStepExecutionRepository(db: DbConnection) {
  const create = (input: CreateStepExecutionInput): StepExecution => {
    const now = nowIso();
    db.prepare(
      "INSERT INTO step_executions (id, run_id, step_index, step_name, agent_role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)",
    ).run(input.id, input.runId, input.stepIndex, input.stepName, input.agentRole, now, now);
    const row = db.prepare("SELECT * FROM step_executions WHERE id = ?").get(input.id) as
      | StepExecutionRow
      | undefined;
    if (!row) {
      throw new Error("Failed to create step execution");
    }
    return rowToRecord(row);
  };

  const findByRunId = (runId: string): StepExecution[] => {
    const rows = db
      .prepare("SELECT * FROM step_executions WHERE run_id = ? ORDER BY step_index ASC")
      .all(runId) as StepExecutionRow[];
    return rows.map(rowToRecord);
  };

  const findByRunIdAndStepIndex = (runId: string, stepIndex: number): StepExecution | undefined => {
    const row = db
      .prepare("SELECT * FROM step_executions WHERE run_id = ? AND step_index = ?")
      .get(runId, stepIndex) as StepExecutionRow | undefined;
    if (!row) return undefined;
    return rowToRecord(row);
  };

  const updateStatus = (id: string, status: StepStatus): StepExecution | undefined => {
    const now = nowIso();
    db.prepare("UPDATE step_executions SET status = ?, updated_at = ? WHERE id = ?").run(
      status,
      now,
      id,
    );
    const row = db.prepare("SELECT * FROM step_executions WHERE id = ?").get(id) as
      | StepExecutionRow
      | undefined;
    if (!row) return undefined;
    return rowToRecord(row);
  };

  const updateComplete = (
    id: string,
    status: "COMPLETED" | "FAILED",
    durationMs: number,
    errorMessage: string | null,
    outputArtifactPath: string | null,
  ): StepExecution | undefined => {
    const now = nowIso();
    db.prepare(
      "UPDATE step_executions SET status = ?, ended_at = ?, duration_ms = ?, error_message = ?, output_artifact_path = ?, updated_at = ? WHERE id = ?",
    ).run(status, now, durationMs, errorMessage, outputArtifactPath, now, id);
    const row = db.prepare("SELECT * FROM step_executions WHERE id = ?").get(id) as
      | StepExecutionRow
      | undefined;
    if (!row) return undefined;
    return rowToRecord(row);
  };

  const updateStartedAt = (id: string): StepExecution | undefined => {
    const now = nowIso();
    db.prepare(
      "UPDATE step_executions SET status = 'RUNNING', started_at = ?, updated_at = ? WHERE id = ?",
    ).run(now, now, id);
    const row = db.prepare("SELECT * FROM step_executions WHERE id = ?").get(id) as
      | StepExecutionRow
      | undefined;
    if (!row) return undefined;
    return rowToRecord(row);
  };

  return {
    create,
    findByRunId,
    findByRunIdAndStepIndex,
    updateStatus,
    updateComplete,
    updateStartedAt,
  };
}
