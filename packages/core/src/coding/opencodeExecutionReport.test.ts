import { describe, it, expect } from "vitest";
import { generateOpenCodeExecutionReport } from "./opencodeExecutionReport.js";

describe("generateOpenCodeExecutionReport", () => {
  it("generates a success report", () => {
    const report = generateOpenCodeExecutionReport({
      adapterName: "OpenCode CLI",
      command: "opencode --prompt [implementation-prompt]",
      workingDirectory: "/project",
      dryRun: false,
      startTime: "2025-01-01T00:00:00.000Z",
      endTime: "2025-01-01T00:01:00.000Z",
      durationMs: 60000,
      exitCode: 0,
      stdoutSummary: "Code generated successfully",
      stderrSummary: "",
      changedFiles: ["src/index.ts", "src/app.ts"],
      success: true,
      gitDiffSummary: undefined,
      nextSteps: ["Review the changes", "Run tests"],
    });

    expect(report).toContain("# OpenCode Execution Report");
    expect(report).toContain("✅ Success");
    expect(report).toContain("src/index.ts");
    expect(report).toContain("src/app.ts");
    expect(report).toContain("## Verification");
  });

  it("generates a failure report", () => {
    const report = generateOpenCodeExecutionReport({
      adapterName: "OpenCode CLI",
      command: "opencode --prompt [implementation-prompt]",
      workingDirectory: "/project",
      dryRun: false,
      startTime: "2025-01-01T00:00:00.000Z",
      endTime: "2025-01-01T00:00:30.000Z",
      durationMs: 30000,
      exitCode: 1,
      stdoutSummary: "",
      stderrSummary: "Error: command not found",
      changedFiles: [],
      success: false,
      gitDiffSummary: undefined,
      nextSteps: ["Check the error output"],
    });

    expect(report).toContain("# OpenCode Execution Report");
    expect(report).toContain("❌ Failed");
    expect(report).toContain("## Troubleshooting");
  });

  it("generates a dry-run report", () => {
    const report = generateOpenCodeExecutionReport({
      adapterName: "OpenCode CLI",
      command: "opencode --prompt [implementation-prompt]",
      workingDirectory: "/project",
      dryRun: true,
      startTime: "2025-01-01T00:00:00.000Z",
      endTime: "2025-01-01T00:00:00.000Z",
      durationMs: 0,
      exitCode: 0,
      stdoutSummary: "[DRY RUN]",
      stderrSummary: "",
      changedFiles: [],
      success: true,
      gitDiffSummary: undefined,
      nextSteps: undefined,
    });

    expect(report).toContain("# OpenCode Execution Report");
    expect(report).toContain("**Dry Run:** Yes");
  });

  it("redacts secrets from output", () => {
    const report = generateOpenCodeExecutionReport({
      adapterName: "OpenCode CLI",
      command: "opencode --prompt [implementation-prompt]",
      workingDirectory: "/project",
      dryRun: false,
      startTime: "2025-01-01T00:00:00.000Z",
      endTime: "2025-01-01T00:01:00.000Z",
      durationMs: 60000,
      exitCode: 0,
      stdoutSummary: "Using api_key=sk-1234567890abcdef",
      stderrSummary: "",
      changedFiles: [],
      success: true,
      gitDiffSummary: undefined,
      nextSteps: undefined,
    });

    expect(report).toContain("[REDACTED]");
    expect(report).not.toContain("api_key=sk-1234567890abcdef");
  });
});
