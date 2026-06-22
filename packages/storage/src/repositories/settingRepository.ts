import { nowIso } from "@aiteam/shared";
import type { DbConnection } from "../db.js";

interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

export interface SettingRecord {
  key: string;
  value: string;
  updatedAt: string;
}

export function createSettingRepository(db: DbConnection) {
  const get = (key: string): string | undefined => {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
      | { value: string }
      | undefined;
    return row?.value;
  };

  const getAll = (): SettingRecord[] => {
    const rows = db
      .prepare("SELECT key, value, updated_at FROM settings ORDER BY key")
      .all() as SettingRow[];
    return rows.map((row) => ({
      key: row.key,
      value: row.value,
      updatedAt: row.updated_at,
    }));
  };

  const set = (key: string, value: string): void => {
    const now = nowIso();
    db.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    ).run(key, value, now);
  };

  return { get, getAll, set };
}
