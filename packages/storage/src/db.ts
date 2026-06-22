import Database from "better-sqlite3";
import { SCHEMA_SQL } from "./schema.js";

export function openDatabase(dbPath: string): Database.Database {
  return new Database(dbPath);
}

export function initializeSchema(db: Database.Database): void {
  db.exec(SCHEMA_SQL);
}
