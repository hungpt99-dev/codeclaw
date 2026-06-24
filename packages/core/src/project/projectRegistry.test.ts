import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unlink, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const testHome = join(tmpdir(), "codeclaw-test-registry");
process.env.CODECLAW_HOME = testHome;

async function getRegistry() {
  return import("./projectRegistry.js");
}

describe("projectRegistry", () => {
  beforeEach(async () => {
    try {
      await unlink(join(testHome, "projects.json"));
    } catch {
      // file may not exist
    }
    try {
      await rmdir(testHome);
    } catch {
      // dir may not exist
    }
  });

  afterEach(() => {
    // cleanup handled in beforeEach
  });

  it("returns empty registry when no file exists", async () => {
    const registry = await getRegistry();
    const result = await registry.loadRegistry();
    expect(result.version).toBe(1);
    expect(result.projects).toEqual([]);
    expect(result.activeProjectId).toBeNull();
  });

  it("adds a project and returns it", async () => {
    const registry = await getRegistry();
    const entry = await registry.addProject("my-app", "/home/user/my-app");

    expect(entry.name).toBe("my-app");
    expect(entry.rootPath).toBe("/home/user/my-app");
    expect(entry.id).toContain("proj_");
    expect(entry.createdAt).toBeTruthy();
    expect(entry.lastUsedAt).toBeTruthy();
  });

  it("lists projects sorted by updatedAt descending", async () => {
    const registry = await getRegistry();
    await registry.addProject("project-a", "/path/a");
    await registry.addProject("project-b", "/path/b");

    const projects = await registry.listProjects();
    expect(projects).toHaveLength(2);
  });

  it("finds a project by name", async () => {
    const registry = await getRegistry();
    await registry.addProject("my-app", "/home/user/my-app");

    const found = await registry.findProject("my-app");
    expect(found).toBeDefined();
    expect(found?.name).toBe("my-app");
  });

  it("finds a project by id", async () => {
    const registry = await getRegistry();
    const entry = await registry.addProject("my-app", "/home/user/my-app");

    const found = await registry.findProject(entry.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(entry.id);
  });

  it("returns undefined for non-existent project", async () => {
    const registry = await getRegistry();
    const found = await registry.findProject("nonexistent");
    expect(found).toBeUndefined();
  });

  it("sets active project", async () => {
    const registry = await getRegistry();
    const entry = await registry.addProject("my-app", "/path/my-app");

    const active = await registry.setActiveProject("my-app");
    expect(active).toBeDefined();
    expect(active?.id).toBe(entry.id);

    const current = await registry.getActiveProject();
    expect(current).toBeDefined();
    expect(current?.id).toBe(entry.id);
  });

  it("removes a project", async () => {
    const registry = await getRegistry();
    await registry.addProject("my-app", "/path/my-app");

    const removed = await registry.removeProject("my-app");
    expect(removed).toBe(true);

    const found = await registry.findProject("my-app");
    expect(found).toBeUndefined();
  });

  it("returns false when removing non-existent project", async () => {
    const registry = await getRegistry();
    const removed = await registry.removeProject("nonexistent");
    expect(removed).toBe(false);
  });

  it("throws when adding duplicate project name", async () => {
    const registry = await getRegistry();
    await registry.addProject("my-app", "/path/a");

    await expect(registry.addProject("my-app", "/path/b")).rejects.toThrow("already exists");
  });

  it("clears active project when removing it", async () => {
    const registry = await getRegistry();
    await registry.addProject("my-app", "/path/my-app");
    await registry.setActiveProject("my-app");

    await registry.removeProject("my-app");
    const current = await registry.getActiveProject();
    expect(current).toBeUndefined();
  });

  it("persists to disk and can be loaded again", async () => {
    const registry = await getRegistry();
    await registry.addProject("persist-test", "/path/persist-test");
    await registry.setActiveProject("persist-test");

    const { loadRegistry } = await getRegistry();
    const loaded = await loadRegistry();
    expect(loaded.projects).toHaveLength(1);
    expect(loaded.projects[0]?.name).toBe("persist-test");
    expect(loaded.activeProjectId).toBe(loaded.projects[0]?.id);
  });
});
