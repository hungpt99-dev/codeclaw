import type Database from "better-sqlite3";
import { nowIso } from "@aiteam/shared";

export function createSettingRepository(db: Database.Database) {
  const get = (key: string): string | undefined => {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
      | { value: string }
      | undefined;
    return row?.value;
  };

  const set = (key: string, value: string): void => {
    const now = nowIso();
    db.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    ).run(key, value, now);
  };

  return { get, set };
}
