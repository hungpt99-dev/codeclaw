import { nowIso } from "@codeclaw/shared";
import type { CoverageStatus } from "@codeclaw/shared";
import type { DbConnection } from "../db.js";

interface TraceabilityRow {
  id: string;
  run_id: string;
  requirement_id: string;
  requirement_text: string;
  acceptance_criteria_ids: string;
  task_ids: string;
  code_files: string;
  test_cases: string;
  test_results: string;
  status: string;
  created_at: string;
}

export interface TraceabilityRecord {
  id: string;
  runId: string;
  requirementId: string;
  requirementText: string;
  acceptanceCriteriaIds: string[];
  taskIds: string[];
  codeFiles: string[];
  testCases: string[];
  testResults: string[];
  status: CoverageStatus;
  createdAt: string;
}

function parseCsv(value: string): string[] {
  if (!value) return [];
  return JSON.parse(value) as string[];
}

function rowToRecord(row: TraceabilityRow): TraceabilityRecord {
  return {
    id: row.id,
    runId: row.run_id,
    requirementId: row.requirement_id,
    requirementText: row.requirement_text,
    acceptanceCriteriaIds: parseCsv(row.acceptance_criteria_ids),
    taskIds: parseCsv(row.task_ids),
    codeFiles: parseCsv(row.code_files),
    testCases: parseCsv(row.test_cases),
    testResults: parseCsv(row.test_results),
    status: row.status as CoverageStatus,
    createdAt: row.created_at,
  };
}

export interface CreateTraceabilityItemInput {
  id: string;
  runId: string;
  requirementId: string;
  requirementText: string;
  acceptanceCriteriaIds: string[];
  taskIds: string[];
  codeFiles: string[];
  testCases: string[];
  testResults: string[];
  status: CoverageStatus;
}

export function createTraceabilityRepository(db: DbConnection) {
  const create = (input: CreateTraceabilityItemInput): TraceabilityRecord => {
    const now = nowIso();
    db.prepare(
      `INSERT INTO traceability_items (id, run_id, requirement_id, requirement_text, acceptance_criteria_ids, task_ids, code_files, test_cases, test_results, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.id,
      input.runId,
      input.requirementId,
      input.requirementText,
      JSON.stringify(input.acceptanceCriteriaIds),
      JSON.stringify(input.taskIds),
      JSON.stringify(input.codeFiles),
      JSON.stringify(input.testCases),
      JSON.stringify(input.testResults),
      input.status,
      now,
    );
    const record = findById(input.id);
    if (!record) {
      throw new Error("Failed to create traceability item");
    }
    return record;
  };

  const findById = (id: string): TraceabilityRecord | undefined => {
    const row = db.prepare("SELECT * FROM traceability_items WHERE id = ?").get(id) as
      | TraceabilityRow
      | undefined;
    if (!row) return undefined;
    return rowToRecord(row);
  };

  const findByRunId = (runId: string): TraceabilityRecord[] => {
    const rows = db
      .prepare("SELECT * FROM traceability_items WHERE run_id = ? ORDER BY requirement_id ASC")
      .all(runId) as TraceabilityRow[];
    return rows.map(rowToRecord);
  };

  const findByRequirementId = (runId: string, reqId: string): TraceabilityRecord | undefined => {
    const row = db
      .prepare("SELECT * FROM traceability_items WHERE run_id = ? AND requirement_id = ?")
      .get(runId, reqId) as TraceabilityRow | undefined;
    if (!row) return undefined;
    return rowToRecord(row);
  };

  const deleteByRunId = (runId: string): void => {
    db.prepare("DELETE FROM traceability_items WHERE run_id = ?").run(runId);
  };

  const getSummary = (
    runId: string,
  ): { total: number; covered: number; partial: number; notCovered: number } => {
    const rows = db
      .prepare("SELECT status FROM traceability_items WHERE run_id = ?")
      .all(runId) as { status: string }[];
    let total = 0;
    let covered = 0;
    let partial = 0;
    let notCovered = 0;
    for (const row of rows) {
      total++;
      if (row.status === "COVERED") covered++;
      else if (row.status === "PARTIAL") partial++;
      else notCovered++;
    }
    return { total, covered, partial, notCovered };
  };

  return {
    create,
    findById,
    findByRunId,
    findByRequirementId,
    deleteByRunId,
    getSummary,
  };
}
