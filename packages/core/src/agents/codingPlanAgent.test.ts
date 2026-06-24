import { describe, it, expect } from "vitest";
import { runCodingPlanAgent } from "./codingPlanAgent.js";
import type { CodingPlanAgentInput } from "./codingPlanAgent.js";

function makeInput(overrides?: Partial<CodingPlanAgentInput>): CodingPlanAgentInput {
  return {
    requirement: "Add user login page",
    clarifiedRequirement: "The system should allow users to log in with email and password",
    businessRules: "Passwords must be at least 8 characters",
    acceptanceCriteria: "AC-001: User can log in with valid credentials",
    technicalDesign: "Use JWT token authentication with refresh tokens",
    apiDesign: "POST /api/auth/login returns JWT token",
    dbDesign: "Users table with email, password_hash, salt",
    taskBreakdownMd: "T-001: Create login endpoint\nT-002: Add JWT middleware",
    testMatrixMd: "TC-001: Valid login returns token\nTC-002: Invalid password returns 401",
    ...overrides,
  };
}

describe("runCodingPlanAgent (deterministic fallback)", () => {
  it("returns structured output without AI tool", async () => {
    const result = await runCodingPlanAgent(makeInput());
    expect(result).toHaveProperty("codingPlanMd");
    expect(result.codingPlanMd).toBeTruthy();
  });

  it("includes Files to Create section", async () => {
    const result = await runCodingPlanAgent(makeInput());
    expect(result.codingPlanMd).toContain("Files to Create");
  });

  it("includes Files to Modify section", async () => {
    const result = await runCodingPlanAgent(makeInput());
    expect(result.codingPlanMd).toContain("Files to Modify");
  });

  it("includes Implementation Order section", async () => {
    const result = await runCodingPlanAgent(makeInput());
    expect(result.codingPlanMd).toContain("Implementation Order");
  });

  it("includes Patterns and Conventions section", async () => {
    const result = await runCodingPlanAgent(makeInput());
    expect(result.codingPlanMd).toContain("Patterns and Conventions");
  });

  it("includes Risks and Challenges section", async () => {
    const result = await runCodingPlanAgent(makeInput());
    expect(result.codingPlanMd).toContain("Risks and Challenges");
  });

  it("includes Testing Strategy section", async () => {
    const result = await runCodingPlanAgent(makeInput());
    expect(result.codingPlanMd).toContain("Testing Strategy");
  });

  it("includes input requirements in output", async () => {
    const result = await runCodingPlanAgent(
      makeInput({ requirement: "Custom feature requirement" }),
    );
    expect(result.codingPlanMd).toContain("Custom feature requirement");
  });

  it("includes technical design in output", async () => {
    const result = await runCodingPlanAgent(
      makeInput({ technicalDesign: "Microservices architecture" }),
    );
    expect(result.codingPlanMd).toContain("Microservices architecture");
  });

  it("includes task breakdown in output", async () => {
    const result = await runCodingPlanAgent(makeInput({ taskBreakdownMd: "T-001: Build feature" }));
    expect(result.codingPlanMd).toContain("T-001: Build feature");
  });

  it("includes test matrix in output", async () => {
    const result = await runCodingPlanAgent(makeInput({ testMatrixMd: "TC-001: Verify feature" }));
    expect(result.codingPlanMd).toContain("TC-001: Verify feature");
  });
});
