import { describe, it, expect } from "vitest";
import { runSecurityReviewerAgent } from "./securityReviewerAgent.js";
import type { SecurityReviewerAgentInput } from "./securityReviewerAgent.js";

function makeInput(overrides?: Partial<SecurityReviewerAgentInput>): SecurityReviewerAgentInput {
  return {
    clarifiedRequirement: "Implement user authentication",
    technicalDesign: "Design document",
    changedFiles: JSON.stringify({ files: ["src/auth.ts"] }),
    diff: "+ export function login() { return true; }",
    ...overrides,
  };
}

describe("runSecurityReviewerAgent (deterministic fallback)", () => {
  it("returns structured output without AI tool", async () => {
    const result = await runSecurityReviewerAgent(makeInput());
    expect(result).toHaveProperty("securityReview");
    expect(result).toHaveProperty("securityStatus");
  });

  it("returns SECURE for clean input", async () => {
    const result = await runSecurityReviewerAgent(makeInput());
    expect(result.securityStatus).toBe("SECURE");
  });

  it("detects dangerous function calls", async () => {
    const result = await runSecurityReviewerAgent(makeInput({ diff: "+ eval(userInput)\n" }));
    expect(result.securityStatus).toBe("CRITICAL_ISSUES");
    expect(result.securityReview).toContain("eval");
  });

  it("detects sensitive file patterns", async () => {
    const result = await runSecurityReviewerAgent(
      makeInput({
        changedFiles: JSON.stringify({ files: [".env", "config/secret.key"] }),
      }),
    );
    expect(result.securityStatus).toBe("MINOR_ISSUES");
    expect(result.securityReview).toContain(".env");
  });
});
