import { describe, it, expect } from "vitest";
import { parseSecurityReviewerOutput } from "./securityReviewerOutputParser.js";

describe("parseSecurityReviewerOutput", () => {
  const validOutput = `# Security Review Report

## Security Review Summary
SECURE

## Vulnerabilities Found
| Severity | Issue | File | Recommendation |
|----------|-------|------|----------------|
| INFO | No vulnerabilities | — | — |

## Critical Issues
None

## Recommendations
1. Use environment variables
`;

  it("parses security review from AI output", () => {
    const result = parseSecurityReviewerOutput(validOutput, "test requirement");
    expect(result.securityReview).toContain("## Security Review Summary");
    expect(result.securityReview).toContain("SECURE");
  });

  it("detects SECURE status", () => {
    const result = parseSecurityReviewerOutput(validOutput, "test requirement");
    expect(result.securityStatus).toBe("SECURE");
  });

  it("detects MINOR_ISSUES status", () => {
    const result = parseSecurityReviewerOutput(
      `## Security Review Summary\nMINOR_ISSUES\n`,
      "test requirement",
    );
    expect(result.securityStatus).toBe("MINOR_ISSUES");
  });

  it("detects CRITICAL_ISSUES status", () => {
    const result = parseSecurityReviewerOutput(
      `## Security Review Summary\nCRITICAL_ISSUES\n`,
      "test requirement",
    );
    expect(result.securityStatus).toBe("CRITICAL_ISSUES");
  });

  it("returns fallback status when no status found", () => {
    const result = parseSecurityReviewerOutput("No security content", "test requirement");
    expect(result.securityStatus).toBe("MINOR_ISSUES");
  });

  it("handles empty output gracefully", () => {
    const result = parseSecurityReviewerOutput("", "test requirement");
    expect(result.securityReview).toBeTruthy();
  });
});
