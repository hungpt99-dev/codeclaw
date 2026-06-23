import { describe, it, expect } from "vitest";
import { parseBaOutput } from "./baOutputParser.js";

describe("parseBaOutput", () => {
  it("parses sections from structured output", () => {
    const raw = `## Clarified Requirement
The system should allow users to reset passwords via email OTP.

## Business Rules
| ID | Rule | Priority |
| BR-001 | OTP expires after 5 minutes | High |

## Acceptance Criteria
AC-001: User can request password reset

## Open Questions
1. What is the OTP length?

## Assumptions
1. Email delivery is reliable`;

    const result = parseBaOutput(raw, "test requirement");
    expect(result.clarifiedRequirement).toContain("reset passwords");
    expect(result.businessRules).toContain("BR-001");
    expect(result.acceptanceCriteria).toContain("AC-001");
    expect(result.openQuestions).toContain("OTP length");
    expect(result.assumptions).toContain("Email delivery");
  });

  it("uses raw output as clarified requirement when no sections found", () => {
    const raw = "Some unstructured text output from AI";
    const result = parseBaOutput(raw, "test requirement");
    expect(result.clarifiedRequirement).toBe(raw);
    expect(result.businessRules).toBeTruthy();
    expect(result.acceptanceCriteria).toBeTruthy();
    expect(result.openQuestions).toBeTruthy();
    expect(result.assumptions).toBeTruthy();
  });

  it("handles empty input gracefully", () => {
    const result = parseBaOutput("", "test requirement");
    expect(result.clarifiedRequirement).toBeTruthy();
  });
});
