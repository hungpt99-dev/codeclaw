import { describe, it, expect } from "vitest";
import { parseCodingPlanOutput } from "./codingPlanOutputParser.js";

describe("parseCodingPlanOutput", () => {
  it("extracts coding plan section from structured output", () => {
    const raw = `## Some Context
irrelevant

## Coding Plan
### Files to Create
- src/auth/login.tsx

### Files to Modify
- src/api/auth.ts

### Implementation Order
1. src/auth/login.tsx
2. src/api/auth.ts

### Patterns and Conventions
- Use React hooks

### Risks and Challenges
- Token expiration

### Testing Strategy
- Unit test login flow

## Other Section
more text`;

    const result = parseCodingPlanOutput(raw);
    expect(result.codingPlanMd).toContain("Files to Create");
    expect(result.codingPlanMd).toContain("src/auth/login.tsx");
    expect(result.codingPlanMd).toContain("Files to Modify");
    expect(result.codingPlanMd).toContain("Implementation Order");
    expect(result.codingPlanMd).toContain("Patterns and Conventions");
    expect(result.codingPlanMd).toContain("Risks and Challenges");
    expect(result.codingPlanMd).toContain("Testing Strategy");
  });

  it("falls back to raw text when no Coding Plan heading is found", () => {
    const raw = "Some random unstructured content without proper heading.";
    const result = parseCodingPlanOutput(raw);
    expect(result.codingPlanMd).toContain("Coding Plan");
    expect(result.codingPlanMd).toContain(raw);
  });

  it("handles empty input", () => {
    const result = parseCodingPlanOutput("");
    expect(result.codingPlanMd).toBeTruthy();
  });
});
