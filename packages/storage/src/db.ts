import Database from "better-sqlite3";
import { SCHEMA_SQL } from "./schema.js";

export type DbConnection = Database.Database;

export function openDatabase(dbPath: string): DbConnection {
  return new Database(dbPath);
}

export function initializeSchema(db: DbConnection): void {
  db.exec(SCHEMA_SQL);
}
