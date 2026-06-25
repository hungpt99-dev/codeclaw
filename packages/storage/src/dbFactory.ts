import { openDatabase, initializeSchema } from "./db.js";
import type { DbConnection } from "./db.js";

export interface StorageInstance {
  db: DbConnection;
  dbPath: string;
}

const activeConnections = new Map<string, StorageInstance>();

export function getOrCreateStorage(dbPath: string): StorageInstance {
  const existing = activeConnections.get(dbPath);
  if (existing) return existing;

  const db = openDatabase(dbPath);
  initializeSchema(db);
  const instance: StorageInstance = { db, dbPath };
  activeConnections.set(dbPath, instance);
  return instance;
}

export function closeStorage(dbPath: string): void {
  const instance = activeConnections.get(dbPath);
  if (instance) {
    instance.db.close();
    activeConnections.delete(dbPath);
  }
}

export function closeAllStorage(): void {
  for (const [path, instance] of activeConnections) {
    instance.db.close();
    activeConnections.delete(path);
  }
}

export function getStorageForProject(databasePath: string): StorageInstance {
  return getOrCreateStorage(databasePath);
}
