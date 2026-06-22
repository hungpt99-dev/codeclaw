import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "../test-helpers.js";
import { createSettingRepository } from "./settingRepository.js";

describe("SettingRepository", () => {
  let db: Database.Database;
  let repo: ReturnType<typeof createSettingRepository>;

  beforeEach(() => {
    db = createTestDb();
    repo = createSettingRepository(db);
  });

  describe("set and get", () => {
    it("sets and retrieves a setting value", () => {
      repo.set("theme", "dark");
      expect(repo.get("theme")).toBe("dark");
    });

    it("returns undefined for a non-existent key", () => {
      expect(repo.get("nonexistent")).toBeUndefined();
    });

    it("updates an existing setting", () => {
      repo.set("theme", "dark");
      repo.set("theme", "light");
      expect(repo.get("theme")).toBe("light");
    });

    it("handles multiple settings independently", () => {
      repo.set("theme", "dark");
      repo.set("language", "en");
      expect(repo.get("theme")).toBe("dark");
      expect(repo.get("language")).toBe("en");
    });
  });
});
