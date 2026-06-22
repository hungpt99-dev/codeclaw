import type Database from "better-sqlite3";
import { nowIso } from "@aiteam/shared";
import type { RunMode, RunStatus } from "@aiteam/shared";

interface RunRow {
  id: string;
  title: string;
  raw_requirement: string;
  mode: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface RunRecord {
  id: string;
  title: string;
  rawRequirement: string;
  mode: RunMode;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
}

function rowToRecord(row: RunRow): RunRecord {
  return {
    id: row.id,
    title: row.title,
    rawRequirement: row.raw_requirement,
    mode: row.mode as RunMode,
    status: row.status as RunStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateRunInput {
  id: string;
  title: string;
  rawRequirement: string;
  mode: RunMode;
}

export function createRunRepository(db: Database.Database) {
  const create = (input: CreateRunInput): RunRecord => {
    const now = nowIso();
    db.prepare(
      "INSERT INTO runs (id, title, raw_requirement, mode, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(input.id, input.title, input.rawRequirement, input.mode, "CREATED", now, now);
    const record = findById(input.id);
    if (!record) {
      throw new Error("Failed to create run");
    }
    return record;
  };

  const findById = (id: string): RunRecord | undefined => {
    const row = db.prepare("SELECT * FROM runs WHERE id = ?").get(id) as RunRow | undefined;
    if (!row) return undefined;
    return rowToRecord(row);
  };

  const findRecent = (limit: number): RunRecord[] => {
    const rows = db
      .prepare("SELECT * FROM runs ORDER BY created_at DESC LIMIT ?")
      .all(limit) as RunRow[];
    return rows.map(rowToRecord);
  };

  const updateStatus = (id: string, status: RunStatus): RunRecord | undefined => {
    const now = nowIso();
    db.prepare("UPDATE runs SET status = ?, updated_at = ? WHERE id = ?").run(status, now, id);
    return findById(id);
  };

  return { create, findById, findRecent, updateStatus };
}
