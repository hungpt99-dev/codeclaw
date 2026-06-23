import { nowIso } from "@aiteam/shared";
import type { ApprovalGate, ApprovalStatus } from "@aiteam/shared";
import type { DbConnection } from "../db.js";

interface ApprovalRow {
  id: string;
  run_id: string;
  gate: string;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRecord {
  id: string;
  runId: string;
  gate: ApprovalGate;
  status: ApprovalStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToRecord(row: ApprovalRow): ApprovalRecord {
  return {
    id: row.id,
    runId: row.run_id,
    gate: row.gate as ApprovalGate,
    status: row.status as ApprovalStatus,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateApprovalInput {
  id: string;
  runId: string;
  gate: ApprovalGate;
  status: ApprovalStatus;
  note?: string;
}

export function createApprovalRepository(db: DbConnection) {
  const create = (input: CreateApprovalInput): ApprovalRecord => {
    const now = nowIso();
    db.prepare(
      "INSERT INTO approvals (id, run_id, gate, status, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(input.id, input.runId, input.gate, input.status, input.note ?? null, now, now);
    const record = findById(input.id);
    if (!record) {
      throw new Error("Failed to create approval");
    }
    return record;
  };

  const findById = (id: string): ApprovalRecord | undefined => {
    const row = db.prepare("SELECT * FROM approvals WHERE id = ?").get(id) as
      | ApprovalRow
      | undefined;
    if (!row) return undefined;
    return rowToRecord(row);
  };

  const findByRunId = (runId: string): ApprovalRecord[] => {
    const rows = db
      .prepare("SELECT * FROM approvals WHERE run_id = ? ORDER BY created_at ASC")
      .all(runId) as ApprovalRow[];
    return rows.map(rowToRecord);
  };

  const findByRunIdAndGate = (runId: string, gate: ApprovalGate): ApprovalRecord | undefined => {
    const row = db
      .prepare(
        "SELECT * FROM approvals WHERE run_id = ? AND gate = ? ORDER BY created_at DESC LIMIT 1",
      )
      .get(runId, gate) as ApprovalRow | undefined;
    if (!row) return undefined;
    return rowToRecord(row);
  };

  const updateStatus = (
    id: string,
    status: ApprovalStatus,
    note?: string,
  ): ApprovalRecord | undefined => {
    const now = nowIso();
    db.prepare("UPDATE approvals SET status = ?, note = ?, updated_at = ? WHERE id = ?").run(
      status,
      note ?? null,
      now,
      id,
    );
    return findById(id);
  };

  const isApproved = (runId: string, gate: ApprovalGate): boolean => {
    const record = findByRunIdAndGate(runId, gate);
    return record?.status === "APPROVED";
  };

  return { create, findById, findByRunId, findByRunIdAndGate, updateStatus, isApproved };
}
