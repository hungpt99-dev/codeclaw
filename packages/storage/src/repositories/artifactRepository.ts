import { nowIso } from "@codeclaw/shared";
import type { ArtifactType } from "@codeclaw/shared";
import type { DbConnection } from "../db.js";

interface ArtifactRow {
  id: string;
  run_id: string;
  type: string;
  name: string;
  path: string;
  format: string;
  created_at: string;
}

export interface ArtifactRecord {
  id: string;
  runId: string;
  type: ArtifactType;
  name: string;
  path: string;
  format: string;
  createdAt: string;
}

function rowToRecord(row: ArtifactRow): ArtifactRecord {
  return {
    id: row.id,
    runId: row.run_id,
    type: row.type as ArtifactType,
    name: row.name,
    path: row.path,
    format: row.format,
    createdAt: row.created_at,
  };
}

export interface CreateArtifactInput {
  id: string;
  runId: string;
  type: ArtifactType;
  name: string;
  path: string;
  format: string;
}

export function createArtifactRepository(db: DbConnection) {
  const create = (input: CreateArtifactInput): ArtifactRecord => {
    const now = nowIso();
    db.prepare(
      "INSERT INTO artifacts (id, run_id, type, name, path, format, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(input.id, input.runId, input.type, input.name, input.path, input.format, now);
    const record = findById(input.id);
    if (!record) {
      throw new Error("Failed to create artifact");
    }
    return record;
  };

  const findByRunId = (runId: string): ArtifactRecord[] => {
    const rows = db
      .prepare("SELECT * FROM artifacts WHERE run_id = ? ORDER BY created_at ASC")
      .all(runId) as ArtifactRow[];
    return rows.map(rowToRecord);
  };

  const findById = (id: string): ArtifactRecord | undefined => {
    const row = db.prepare("SELECT * FROM artifacts WHERE id = ?").get(id) as
      | ArtifactRow
      | undefined;
    if (!row) return undefined;
    return rowToRecord(row);
  };

  return { create, findByRunId, findById };
}
