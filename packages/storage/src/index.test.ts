import { describe, it, expect } from "vitest";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createArtifactRepository,
  createSettingRepository,
} from "./index.js";

describe("index barrel exports", () => {
  it("exports openDatabase", () => {
    expect(openDatabase).toBeDefined();
    const db = openDatabase(":memory:");
    expect(db).toBeDefined();
    db.close();
  });

  it("exports initializeSchema", () => {
    expect(initializeSchema).toBeDefined();
  });

  it("exports createRunRepository", () => {
    expect(createRunRepository).toBeDefined();
  });

  it("exports createArtifactRepository", () => {
    expect(createArtifactRepository).toBeDefined();
  });

  it("exports createSettingRepository", () => {
    expect(createSettingRepository).toBeDefined();
  });

  it("can compose all exports together", () => {
    const db = openDatabase(":memory:");
    initializeSchema(db);

    const runRepo = createRunRepository(db);
    const artifactRepo = createArtifactRepository(db);
    const settingRepo = createSettingRepository(db);

    const run = runRepo.create({
      id: "run-1",
      title: "Test",
      rawRequirement: "req",
      outputLanguage: "English",
      mode: "semi-auto",
    });
    expect(run.id).toBe("run-1");

    const artifact = artifactRepo.create({
      id: "art-1",
      runId: "run-1",
      type: "TECHNICAL_DESIGN",
      name: "design.md",
      path: "/tmp/design.md",
      format: "markdown",
    });
    expect(artifact.id).toBe("art-1");

    settingRepo.set("key", "value");
    expect(settingRepo.get("key")).toBe("value");

    db.close();
  });
});
