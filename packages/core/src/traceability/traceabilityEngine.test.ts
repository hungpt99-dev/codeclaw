import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateTraceability, traceabilityToMarkdown } from "./traceabilityEngine.js";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "node:fs/promises";

const mockReadFile = readFile as unknown as ReturnType<typeof vi.fn>;

const mockPaths = {
  runDir: "/fake/runs/run-1",
  inputFile: "/fake/runs/run-1/input.md",
  requirementDir: "/fake/runs/run-1/requirement",
  designDir: "/fake/runs/run-1/design",
  tasksDir: "/fake/runs/run-1/tasks",
  testsDir: "/fake/runs/run-1/tests",
  implementationDir: "/fake/runs/run-1/implementation",
  implementationPromptPath: "/fake/runs/run-1/implementation/implementation-prompt.md",
  agentLogPath: "/fake/runs/run-1/implementation/agent-output.log",
  diffPatchPath: "/fake/runs/run-1/implementation/diff.patch",
  changedFilesPath: "/fake/runs/run-1/implementation/changed-files.json",
  reportDir: "/fake/runs/run-1/report",
  logsDir: "/fake/runs/run-1/logs",
  traceabilityMd: "/fake/runs/run-1/report/traceability.md",
  traceabilityJson: "/fake/runs/run-1/report/traceability.json",
  snapshotDir: "/fake/runs/run-1/snapshots",
  testResultPath: "/fake/runs/run-1/tests/test-result.md",
  failedTestsPath: "/fake/runs/run-1/tests/failed-tests.json",
  reviewDir: "/fake/runs/run-1/review",
  reviewReportPath: "/fake/runs/run-1/review/review-report.md",
  securityReviewPath: "/fake/runs/run-1/review/security-review.md",
  requirementCoveragePath: "/fake/runs/run-1/review/requirement-coverage.md",
};

describe("traceabilityEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateTraceability", () => {
    it("generates traceability matrix from artifacts", async () => {
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes("clarified-requirement.md")) {
          return Promise.resolve("| REQ-001 | User can export invoices |");
        }
        if (path.includes("acceptance-criteria.md")) {
          return Promise.resolve(`
| AC-001 | Export by hotel ID       |
| AC-002 | Export by date range     |
`);
        }
        if (path.includes("task-breakdown.md")) {
          return Promise.resolve(`
| TASK-001 | Implement export API |
| TASK-002 | Add query filters    |
`);
        }
        if (path.includes("test-matrix.md")) {
          return Promise.resolve(`
| TC-001 | Export with valid hotelId |
| TC-002 | Export with invalid date  |
`);
        }
        return Promise.resolve("");
      });

      const matrix = await generateTraceability("run-1", mockPaths);

      expect(matrix.runId).toBe("run-1");
      expect(matrix.items).toHaveLength(1);
      expect(matrix.items[0]?.requirementId).toBe("REQ-001");
      expect(matrix.items[0]?.acceptanceCriteriaIds).toEqual(["AC-001", "AC-002"]);
      expect(matrix.items[0]?.taskIds).toEqual(["TASK-001", "TASK-002"]);
      expect(matrix.items[0]?.testCases).toEqual(["TC-001", "TC-002"]);
      expect(matrix.items[0]?.status).toBe("COVERED");
      expect(matrix.summary.total).toBe(1);
      expect(matrix.summary.covered).toBe(1);
    });

    it("marks as NOT_COVERED when no tasks or tests", async () => {
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes("clarified-requirement.md")) {
          return Promise.resolve("| REQ-001 | Some requirement |");
        }
        return Promise.resolve("");
      });

      const matrix = await generateTraceability("run-1", mockPaths);

      expect(matrix.items[0]?.status).toBe("NOT_COVERED");
      expect(matrix.summary.notCovered).toBe(1);
    });

    it("marks as PARTIAL when only tasks exist", async () => {
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes("clarified-requirement.md")) {
          return Promise.resolve("| REQ-001 | Some requirement |");
        }
        if (path.includes("task-breakdown.md")) {
          return Promise.resolve("| TASK-001 | A task |");
        }
        return Promise.resolve("");
      });

      const matrix = await generateTraceability("run-1", mockPaths);

      expect(matrix.items[0]?.status).toBe("PARTIAL");
      expect(matrix.summary.partial).toBe(1);
    });

    it("handles missing artifacts gracefully", async () => {
      mockReadFile.mockRejectedValue(new Error("File not found"));

      const matrix = await generateTraceability("run-1", mockPaths);

      expect(matrix.items).toHaveLength(0);
      expect(matrix.summary.total).toBe(0);
    });
  });

  describe("traceabilityToMarkdown", () => {
    it("produces valid markdown output", () => {
      const matrix = {
        runId: "run-1",
        items: [
          {
            requirementId: "REQ-001",
            requirementText: "Test req",
            acceptanceCriteriaIds: ["AC-001"],
            taskIds: ["TASK-001"],
            codeFiles: ["File.java"],
            testCases: ["TC-001"],
            testResults: ["PASSED"],
            status: "COVERED" as const,
          },
        ],
        generatedAt: new Date().toISOString(),
        summary: { total: 1, covered: 1, partial: 0, notCovered: 0 },
      };

      const md = traceabilityToMarkdown(matrix);

      expect(md).toContain("# Traceability Matrix");
      expect(md).toContain("REQ-001");
      expect(md).toContain("COVERED");
      expect(md).toContain("Total Items");
    });
  });
});
