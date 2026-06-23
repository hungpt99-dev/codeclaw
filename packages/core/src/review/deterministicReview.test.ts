import { describe, it, expect } from "vitest";
import { generateDeterministicReview } from "./deterministicReview.js";
import type { DeterministicReviewInput } from "./deterministicReview.js";

function makeInput(overrides?: Partial<DeterministicReviewInput>): DeterministicReviewInput {
  return {
    acceptanceCriteria: `
- User can log in with email and password
- User can reset password
- Invalid credentials show error message
`,
    changedFiles: JSON.stringify({ files: ["src/login.ts", "src/login.test.ts"] }),
    diff: `--- a/src/login.ts
+++ b/src/login.ts
@@ -1,3 +1,5 @@
+export function login(email: string, password: string): boolean {
+  return true;
+}
`,
    testResults: "✓ test_login passes\n✓ test_logout passes\n",
    clarifiedRequirement: "Implement user authentication",
    ...overrides,
  };
}

describe("generateDeterministicReview", () => {
  it("generates all three review artifacts", () => {
    const result = generateDeterministicReview(makeInput());
    expect(result.reviewReport).toBeTruthy();
    expect(result.securityReview).toBeTruthy();
    expect(result.requirementCoverage).toBeTruthy();
  });

  it("returns APPROVED for clean input", () => {
    const result = generateDeterministicReview(makeInput());
    expect(result.overallStatus).toBe("APPROVED");
  });

  it("detects failing tests and returns CHANGES_REQUIRED", () => {
    const result = generateDeterministicReview(
      makeInput({ testResults: "✗ test_login fails\n✓ test_logout passes\n" }),
    );
    expect(result.overallStatus).toBe("CHANGES_REQUIRED");
  });

  it("detects sensitive file patterns and returns CHANGES_REQUIRED", () => {
    const result = generateDeterministicReview(
      makeInput({
        changedFiles: JSON.stringify({ files: ["config/secrets.env", "src/auth.ts"] }),
      }),
    );
    expect(result.overallStatus).toBe("CHANGES_REQUIRED");
  });

  it("returns APPROVED when all tests pass", () => {
    const result = generateDeterministicReview(makeInput({ testResults: "✓ all tests pass ✓" }));
    expect(result.overallStatus).toBe("APPROVED");
  });

  it("parses acceptance criteria from bullet points", () => {
    const result = generateDeterministicReview(makeInput());
    expect(result.requirementCoverage).toContain("AC-1");
    expect(result.requirementCoverage).toContain("AC-2");
    expect(result.requirementCoverage).toContain("AC-3");
  });

  it("includes security review with sensitive file warnings", () => {
    const result = generateDeterministicReview(
      makeInput({
        changedFiles: JSON.stringify({ files: [".env", "config/password.txt"] }),
      }),
    );
    expect(result.securityReview).toContain(".env");
    expect(result.securityReview).toContain("password");
  });

  it("handles empty changed files gracefully", () => {
    const result = generateDeterministicReview(makeInput({ changedFiles: "" }));
    expect(result.reviewReport).toBeTruthy();
  });

  it("parses JSON changed files format", () => {
    const result = generateDeterministicReview(
      makeInput({ changedFiles: JSON.stringify({ files: ["a.ts", "b.ts"] }) }),
    );
    expect(result.reviewReport).toContain("Files changed");
  });

  it("parses plain text changed files format", () => {
    const result = generateDeterministicReview(makeInput({ changedFiles: "src/a.ts\nsrc/b.ts" }));
    expect(result.reviewReport).toBeTruthy();
  });

  it("generates requirement coverage with table format", () => {
    const result = generateDeterministicReview(makeInput());
    expect(result.requirementCoverage).toContain("| Metric | Value |");
    expect(result.requirementCoverage).toContain("| AC-1");
    expect(result.requirementCoverage).toContain("| AC-2");
    expect(result.requirementCoverage).toContain("| AC-3");
  });

  it("generates review report with all sections", () => {
    const result = generateDeterministicReview(makeInput());
    expect(result.reviewReport).toContain("## Review Summary");
    expect(result.reviewReport).toContain("## Requirement Coverage");
    expect(result.reviewReport).toContain("## Code Quality");
    expect(result.reviewReport).toContain("## Test Quality");
    expect(result.reviewReport).toContain("## Security");
  });
});
