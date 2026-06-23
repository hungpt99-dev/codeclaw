import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReadFile = vi.fn();
const mockAccess = vi.fn();

vi.mock("node:fs/promises", () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args) as Promise<string>,
  access: (...args: unknown[]) => mockAccess(...args) as Promise<void>,
  writeFile: vi.fn(),
}));
import { runReview, loadAndReview, persistReview } from "./reviewService.js";

describe("runReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs deterministic review when no AI tool is configured", async () => {
    const result = await runReview({
      runId: "test-run",
      clarifiedRequirement: "Test requirement",
      acceptanceCriteria: "- User can log in",
      technicalDesign: "Design doc",
      changedFiles: JSON.stringify({ files: ["src/auth.ts"] }),
      diff: "+ some code",
      testResults: "PASSED: 1 test passed",
    });

    expect(result.reviewReport).toBeTruthy();
    expect(result.securityReview).toBeTruthy();
    expect(result.requirementCoverage).toBeTruthy();
    expect(result.overallStatus).toBeDefined();
  });

  it("returns structured output with all required fields", async () => {
    const result = await runReview({
      runId: "test-run",
      clarifiedRequirement: "Req",
      acceptanceCriteria: "- AC1",
      technicalDesign: "Design",
      changedFiles: "[]",
      diff: "",
      testResults: "No tests",
    });

    expect(result).toHaveProperty("reviewReport");
    expect(result).toHaveProperty("securityReview");
    expect(result).toHaveProperty("requirementCoverage");
    expect(result).toHaveProperty("overallStatus");
    expect(["APPROVED", "APPROVED_WITH_WARNINGS", "CHANGES_REQUIRED"]).toContain(
      result.overallStatus,
    );
  });
});

describe("loadAndReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to deterministic when artifacts are missing", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT"));
    mockReadFile.mockRejectedValue(new Error("ENOENT"));

    const result = await loadAndReview("test-run-id");
    expect(result.reviewReport).toBeTruthy();
    expect(result.overallStatus).toBeDefined();
  });
});

describe("persistReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes review artifacts to disk", async () => {
    const { writeFile } = await import("node:fs/promises");
    const mockWriteFile = vi.mocked(writeFile);

    const output = {
      reviewReport: "# Review\nAPPROVED",
      securityReview: "# Security\nSECURE",
      requirementCoverage: "# Coverage\nAll covered",
      overallStatus: "APPROVED" as const,
    };

    const result = await persistReview("test-run-id", output);
    expect(result.reviewReportPath).toContain("review-report.md");
    expect(result.securityReviewPath).toContain("security-review.md");
    expect(result.requirementCoveragePath).toContain("requirement-coverage.md");
    expect(mockWriteFile).toHaveBeenCalledTimes(3);
  });
});
