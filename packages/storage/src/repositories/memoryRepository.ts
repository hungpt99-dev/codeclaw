import { nowIso } from "@codeclaw/shared";
import type { MemoryScope, MemoryFormat } from "@codeclaw/shared";
import type { DbConnection } from "../db.js";

interface MemoryItemRow {
  id: string;
  scope: string;
  title: string;
  path: string;
  format: string;
  tags: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

interface MemoryRelationRow {
  id: string;
  source_memory_id: string;
  target_memory_id: string;
  relation_type: string;
  created_at: string;
}

export interface MemoryItemRecord {
  id: string;
  scope: MemoryScope;
  title: string;
  path: string;
  format: MemoryFormat;
  tags: string[];
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryRelationRecord {
  id: string;
  sourceMemoryId: string;
  targetMemoryId: string;
  relationType: string;
  createdAt: string;
}

export interface CreateMemoryItemInput {
  id: string;
  scope: MemoryScope;
  title: string;
  path: string;
  format: MemoryFormat;
  tags: string[];
  summary?: string;
}

export interface CreateMemoryRelationInput {
  id: string;
  sourceMemoryId: string;
  targetMemoryId: string;
  relationType: string;
}

function rowToRecord(row: MemoryItemRow): MemoryItemRecord {
  return {
    id: row.id,
    scope: row.scope as MemoryScope,
    title: row.title,
    path: row.path,
    format: row.format as MemoryFormat,
    tags: JSON.parse(row.tags) as string[],
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function relationRowToRecord(row: MemoryRelationRow): MemoryRelationRecord {
  return {
    id: row.id,
    sourceMemoryId: row.source_memory_id,
    targetMemoryId: row.target_memory_id,
    relationType: row.relation_type,
    createdAt: row.created_at,
  };
}

export function createMemoryRepository(db: DbConnection) {
  const create = (input: CreateMemoryItemInput): MemoryItemRecord => {
    const now = nowIso();
    db.prepare(
      "INSERT INTO memory_items (id, scope, title, path, format, tags, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      input.id,
      input.scope,
      input.title,
      input.path,
      input.format,
      JSON.stringify(input.tags),
      input.summary ?? null,
      now,
      now,
    );
    const record = findById(input.id);
    if (!record) {
      throw new Error("Failed to create memory item");
    }
    return record;
  };

  const findById = (id: string): MemoryItemRecord | undefined => {
    const row = db.prepare("SELECT * FROM memory_items WHERE id = ?").get(id) as
      | MemoryItemRow
      | undefined;
    if (!row) return undefined;
    return rowToRecord(row);
  };

  const findByScope = (scope: MemoryScope): MemoryItemRecord[] => {
    const rows = db
      .prepare("SELECT * FROM memory_items WHERE scope = ? ORDER BY created_at ASC")
      .all(scope) as MemoryItemRow[];
    return rows.map(rowToRecord);
  };

  const findByTag = (tag: string): MemoryItemRecord[] => {
    const rows = db
      .prepare("SELECT * FROM memory_items WHERE tags LIKE ? ORDER BY created_at ASC")
      .all(`%${tag}%`) as MemoryItemRow[];
    return rows.map(rowToRecord);
  };

  const findAll = (): MemoryItemRecord[] => {
    const rows = db
      .prepare("SELECT * FROM memory_items ORDER BY created_at ASC")
      .all() as MemoryItemRow[];
    return rows.map(rowToRecord);
  };

  const upsert = (input: CreateMemoryItemInput): MemoryItemRecord => {
    const existing = findById(input.id);
    const now = nowIso();
    if (existing) {
      db.prepare(
        "UPDATE memory_items SET scope = ?, title = ?, path = ?, format = ?, tags = ?, summary = ?, updated_at = ? WHERE id = ?",
      ).run(
        input.scope,
        input.title,
        input.path,
        input.format,
        JSON.stringify(input.tags),
        input.summary ?? null,
        now,
        input.id,
      );
    } else {
      db.prepare(
        "INSERT INTO memory_items (id, scope, title, path, format, tags, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        input.id,
        input.scope,
        input.title,
        input.path,
        input.format,
        JSON.stringify(input.tags),
        input.summary ?? null,
        now,
        now,
      );
    }
    const record = findById(input.id);
    if (!record) {
      throw new Error("Failed to upsert memory item");
    }
    return record;
  };

  const deleteById = (id: string): boolean => {
    const result = db.prepare("DELETE FROM memory_items WHERE id = ?").run(id);
    return result.changes > 0;
  };

  const deleteAll = (): void => {
    db.prepare("DELETE FROM memory_items").run();
  };

  const createRelation = (input: CreateMemoryRelationInput): MemoryRelationRecord => {
    const now = nowIso();
    db.prepare(
      "INSERT INTO memory_relations (id, source_memory_id, target_memory_id, relation_type, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(input.id, input.sourceMemoryId, input.targetMemoryId, input.relationType, now);
    const row = db.prepare("SELECT * FROM memory_relations WHERE id = ?").get(input.id) as
      | MemoryRelationRow
      | undefined;
    if (!row) {
      throw new Error("Failed to create memory relation");
    }
    return relationRowToRecord(row);
  };

  const findRelations = (memoryId: string): MemoryRelationRecord[] => {
    const rows = db
      .prepare(
        "SELECT * FROM memory_relations WHERE source_memory_id = ? OR target_memory_id = ? ORDER BY created_at ASC",
      )
      .all(memoryId, memoryId) as MemoryRelationRow[];
    return rows.map(relationRowToRecord);
  };

  const countByScope = (scope: MemoryScope): number => {
    const row = db
      .prepare("SELECT COUNT(*) as count FROM memory_items WHERE scope = ?")
      .get(scope) as { count: number };
    return row.count;
  };

  const countAll = (): number => {
    const row = db.prepare("SELECT COUNT(*) as count FROM memory_items").get() as {
      count: number;
    };
    return row.count;
  };

  return {
    create,
    findById,
    findByScope,
    findByTag,
    findAll,
    upsert,
    deleteById,
    deleteAll,
    createRelation,
    findRelations,
    countByScope,
    countAll,
  };
}
