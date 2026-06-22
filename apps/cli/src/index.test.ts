import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { initCommand } from "./commands/init.js";
import { doctorCommand } from "./commands/doctor.js";
import { runCommand } from "./commands/run.js";
import { listCommand } from "./commands/list.js";
import { showCommand } from "./commands/show.js";
import { uiCommand } from "./commands/ui.js";

function tempDir(): string {
  return join(tmpdir(), "aiteam-cli-test-" + randomUUID());
}

function mockProcessExit() {
  return vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit");
  });
}

describe("initCommand", () => {
  let cwd: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    cwd = tempDir();
    await mkdir(cwd, { recursive: true });
    process.chdir(cwd);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(cwd, { recursive: true, force: true });
  });

  it("creates .ai-team with all required files", async () => {
    await initCommand({});

    const { access } = await import("node:fs/promises");
    await access(join(cwd, ".ai-team"));
    await access(join(cwd, ".ai-team", "config.json"));
    await access(join(cwd, ".ai-team", "database.sqlite"));
    await access(join(cwd, ".ai-team", "prompts"));
    await access(join(cwd, ".ai-team", "runs"));
  });

  it("creates valid config.json", async () => {
    await initCommand({});

    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(join(cwd, ".ai-team", "config.json"), "utf-8");
    const config = JSON.parse(raw) as Record<string, unknown>;
    expect(config.version).toBe("0.1.0");
    const workflow = config.workflow as Record<string, unknown>;
    expect(workflow.defaultMode).toBe("docs-only");
  });

  it("applies --type option to config", async () => {
    await initCommand({ type: "mobile" });

    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(join(cwd, ".ai-team", "config.json"), "utf-8");
    const config = JSON.parse(raw) as Record<string, unknown>;
    const project = config.project as Record<string, unknown>;
    expect(project.type).toBe("mobile");
  });

  it("applies --output-language option to config", async () => {
    await initCommand({ outputLanguage: "vietnamese" });

    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(join(cwd, ".ai-team", "config.json"), "utf-8");
    const config = JSON.parse(raw) as Record<string, unknown>;
    const workflow = config.workflow as Record<string, unknown>;
    expect(workflow.defaultOutputLanguage).toBe("vietnamese");
  });

  it("refuses to overwrite without --force", async () => {
    await initCommand({});

    const mockExit = mockProcessExit();

    await expect(initCommand({})).rejects.toThrow("process.exit");

    mockExit.mockRestore();
  });

  it("overwrites with --force", async () => {
    await initCommand({});
    await initCommand({ force: true });

    const { access } = await import("node:fs/promises");
    await access(join(cwd, ".ai-team", "config.json"));
  });
});

describe("doctorCommand", () => {
  let cwd: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    cwd = tempDir();
    await mkdir(cwd, { recursive: true });
    process.chdir(cwd);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(cwd, { recursive: true, force: true });
  });

  it("fails when .ai-team does not exist", async () => {
    const mockExit = mockProcessExit();

    await expect(doctorCommand()).rejects.toThrow("process.exit");

    mockExit.mockRestore();
  });

  it("passes when .ai-team is properly initialized", async () => {
    await initCommand({});

    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await doctorCommand();

    expect(mockExit).not.toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });
});

describe("runCommand", () => {
  let cwd: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    cwd = tempDir();
    await mkdir(cwd, { recursive: true });
    process.chdir(cwd);
    await initCommand({});
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(cwd, { recursive: true, force: true });
  });

  it("fails when .ai-team does not exist", async () => {
    const emptyDir = tempDir();
    await mkdir(emptyDir, { recursive: true });
    process.chdir(emptyDir);

    const mockExit = mockProcessExit();

    await expect(runCommand("test requirement", {})).rejects.toThrow("process.exit");

    mockExit.mockRestore();
    await rm(emptyDir, { recursive: true, force: true });
  });

  it("runs docs-only workflow and saves to database", async () => {
    await runCommand("Build a todo app", {});

    const { readdir, access } = await import("node:fs/promises");
    const runsDir = join(cwd, ".ai-team", "runs");
    const entries = await readdir(runsDir);
    expect(entries.length).toBeGreaterThan(0);

    const firstEntry = entries[0];
    if (firstEntry) {
      const runDir = join(runsDir, firstEntry);
      await access(join(runDir, "input.md"));
      await access(join(runDir, "report", "final-report.md"));
    }
  });

  it("outputs JSON when --json flag is set", async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    await runCommand("Build a todo app", { json: true });

    const jsonOutput = logs.find((l) => l.includes('"runId"'));
    expect(jsonOutput).toBeDefined();
    if (jsonOutput) {
      const parsed = JSON.parse(jsonOutput) as Record<string, unknown>;
      expect(parsed.status).toBe("REPORT_GENERATED");
      expect(parsed.artifacts).toBeInstanceOf(Array);
    }

    spy.mockRestore();
  });

  it("uses custom title when --title is provided", async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    await runCommand("Build a todo app", { title: "My Custom Title" });

    spy.mockRestore();
  });
});

describe("listCommand", () => {
  let cwd: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    cwd = tempDir();
    await mkdir(cwd, { recursive: true });
    process.chdir(cwd);
    await initCommand({});
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(cwd, { recursive: true, force: true });
  });

  it("shows no runs message when empty", async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    await listCommand();

    const output = logs.join("\n");
    expect(output).toContain("No runs found");

    spy.mockRestore();
  });

  it("shows runs after executing a workflow", async () => {
    await runCommand("Build a todo app", {});

    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    await listCommand();

    const output = logs.join("\n");
    expect(output).toContain("REPORT_GENERATED");
    expect(output).toContain("docs-only");

    spy.mockRestore();
  });

  it("fails when .ai-team does not exist", async () => {
    const emptyDir = tempDir();
    await mkdir(emptyDir, { recursive: true });
    process.chdir(emptyDir);

    const mockExit = mockProcessExit();

    await expect(listCommand()).rejects.toThrow("process.exit");

    mockExit.mockRestore();
    await rm(emptyDir, { recursive: true, force: true });
  });
});

describe("showCommand", () => {
  let cwd: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    cwd = tempDir();
    await mkdir(cwd, { recursive: true });
    process.chdir(cwd);
    await initCommand({});
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(cwd, { recursive: true, force: true });
  });

  it("fails when run does not exist", async () => {
    const mockExit = mockProcessExit();

    await expect(showCommand("nonexistent-run")).rejects.toThrow("process.exit");

    mockExit.mockRestore();
  });

  it("shows run details after executing a workflow", async () => {
    const logs: string[] = [];
    const runSpy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    await runCommand("Build a todo app", { json: true });
    const runOutput = logs.find((l) => l.includes('"runId"'));
    expect(runOutput).toBeDefined();
    if (runOutput) {
      const parsed = JSON.parse(runOutput) as Record<string, unknown>;
      const runId = parsed.runId as string;

      logs.length = 0;

      await showCommand(runId);

      const output = logs.join("\n");
      expect(output).toContain(runId);
      expect(output).toContain("REPORT_GENERATED");
    }

    runSpy.mockRestore();
  });

  it("fails when .ai-team does not exist", async () => {
    const emptyDir = tempDir();
    await mkdir(emptyDir, { recursive: true });
    process.chdir(emptyDir);

    const mockExit = mockProcessExit();

    await expect(showCommand("any-run")).rejects.toThrow("process.exit");

    mockExit.mockRestore();
    await rm(emptyDir, { recursive: true, force: true });
  });
});

describe("uiCommand", () => {
  it("prints instructions without throwing", () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    uiCommand();

    const output = logs.join("\n");
    expect(output).toContain("aiteam UI");
    expect(output).toContain("apps/local-web");

    spy.mockRestore();
  });
});
