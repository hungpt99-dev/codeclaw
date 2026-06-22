import { describe, it, expect } from "vitest";
import { openDatabase, initializeSchema } from "./db.js";

describe("openDatabase", () => {
  it("opens an in-memory database", () => {
    const db = openDatabase(":memory:");
    expect(db).toBeDefined();
    db.close();
  });
});

describe("initializeSchema", () => {
  it("creates tables without error", () => {
    const db = openDatabase(":memory:");
    expect(() => {
      initializeSchema(db);
    }).not.toThrow();
    db.close();
  });

  it("can be called multiple times safely", () => {
    const db = openDatabase(":memory:");
    initializeSchema(db);
    expect(() => {
      initializeSchema(db);
    }).not.toThrow();
    expect(() => {
      initializeSchema(db);
    }).not.toThrow();
    db.close();
  });

  it("creates the runs table", () => {
    const db = openDatabase(":memory:");
    initializeSchema(db);
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='runs'")
      .get() as { name: string } | undefined;
    expect(row).toBeDefined();
    if (row) {
      expect(row.name).toBe("runs");
    }
    db.close();
  });

  it("creates the artifacts table", () => {
    const db = openDatabase(":memory:");
    initializeSchema(db);
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='artifacts'")
      .get() as { name: string } | undefined;
    expect(row).toBeDefined();
    if (row) {
      expect(row.name).toBe("artifacts");
    }
    db.close();
  });

  it("creates the settings table", () => {
    const db = openDatabase(":memory:");
    initializeSchema(db);
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")
      .get() as { name: string } | undefined;
    expect(row).toBeDefined();
    if (row) {
      expect(row.name).toBe("settings");
    }
    db.close();
  });
});
