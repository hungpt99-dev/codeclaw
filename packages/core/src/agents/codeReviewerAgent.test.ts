import { describe, it, expect } from "vitest";
import { runCodeReviewerAgent } from "./codeReviewerAgent.js";
import type { CodeReviewerAgentInput } from "./codeReviewerAgent.js";

function makeInput(overrides?: Partial<CodeReviewerAgentInput>): CodeReviewerAgentInput {
  return {
    clarifiedRequirement: "Implement user authentication",
    acceptanceCriteria: "- User can log in\n- User can reset password",
    technicalDesign: "Design document",
    changedFiles: JSON.stringify({ files: ["src/auth.ts"] }),
    diff: "+ export function login() { return true; }",
    testResults: "✓ test_login passes\n✓ test_logout passes\n",
    ...overrides,
  };
}

describe("runCodeReviewerAgent (deterministic fallback)", () => {
  it("returns structured output without AI tool", async () => {
    const result = await runCodeReviewerAgent(makeInput());
    expect(result).toHaveProperty("reviewReport");
    expect(result).toHaveProperty("requirementCoverage");
    expect(result).toHaveProperty("overallStatus");
  });

  it("generates requirement coverage table", async () => {
    const result = await runCodeReviewerAgent(makeInput());
    expect(result.requirementCoverage).toContain("| Metric | Value |");
    expect(result.requirementCoverage).toContain("AC-1");
    expect(result.requirementCoverage).toContain("AC-2");
  });

  it("returns APPROVED for clean input", async () => {
    const result = await runCodeReviewerAgent(makeInput());
    expect(result.overallStatus).toBe("APPROVED");
  });

  it("returns CHANGES_REQUIRED for failing tests", async () => {
    const result = await runCodeReviewerAgent(makeInput({ testResults: "✗ test_login fails\n" }));
    expect(result.overallStatus).toBe("CHANGES_REQUIRED");
  });
});
