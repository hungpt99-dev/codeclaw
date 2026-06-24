import { describe, it, expect } from "vitest";
import { parseCodeReviewerOutput } from "./codeReviewerOutputParser.js";

describe("parseCodeReviewerOutput", () => {
  const validOutput = `# Review Report

## Review Summary
APPROVED

## Requirement Coverage
| Criteria | Status | Notes |
|----------|--------|-------|
| AC-1 | COVERED | Implementation matches |

## Code Quality
- Clean code, follows patterns

## Test Quality
- All tests pass

## Security
- No issues

## Required Fixes
None
`;

  it("parses review report from AI output", () => {
    const result = parseCodeReviewerOutput(validOutput, "test requirement");
    expect(result.reviewReport).toContain("## Review Summary");
    expect(result.reviewReport).toContain("APPROVED");
  });

  it("extracts requirement coverage section", () => {
    const result = parseCodeReviewerOutput(validOutput, "test requirement");
    expect(result.requirementCoverage).toContain("AC-1");
    expect(result.requirementCoverage).toContain("COVERED");
  });

  it("detects APPROVED status", () => {
    const result = parseCodeReviewerOutput(validOutput, "test requirement");
    expect(result.overallStatus).toBe("APPROVED");
  });

  it("detects CHANGES_REQUIRED status", () => {
    const result = parseCodeReviewerOutput(
      `## Review Summary\nCHANGES_REQUIRED\n`,
      "test requirement",
    );
    expect(result.overallStatus).toBe("CHANGES_REQUIRED");
  });

  it("detects APPROVED_WITH_WARNINGS status", () => {
    const result = parseCodeReviewerOutput(
      `## Review Summary\nAPPROVED_WITH_WARNINGS\n`,
      "test requirement",
    );
    expect(result.overallStatus).toBe("APPROVED_WITH_WARNINGS");
  });

  it("returns fallback status when no status found", () => {
    const result = parseCodeReviewerOutput("No review content", "test requirement");
    expect(result.overallStatus).toBe("CHANGES_REQUIRED");
  });

  it("handles empty output gracefully", () => {
    const result = parseCodeReviewerOutput("", "test requirement");
    expect(result.reviewReport).toBeTruthy();
    expect(result.overallStatus).toBe("CHANGES_REQUIRED");
  });
});
