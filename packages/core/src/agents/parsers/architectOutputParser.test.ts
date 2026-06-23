import { describe, it, expect } from "vitest";
import { parseArchitectOutput } from "./architectOutputParser.js";

describe("parseArchitectOutput", () => {
  it("parses sections from structured output", () => {
    const raw = `## Technical Design
Layered architecture with controllers, services, repositories.

## API Design
POST /api/reset-password

## Database Design
users table with password_reset_tokens`;

    const result = parseArchitectOutput(raw, "test requirement");
    expect(result.technicalDesign).toContain("Layered architecture");
    expect(result.apiDesign).toContain("/api/reset-password");
    expect(result.dbDesign).toContain("password_reset_tokens");
  });

  it("provides fallback for missing sections", () => {
    const result = parseArchitectOutput("Some random text", "test req");
    expect(result.technicalDesign).toBeTruthy();
    expect(result.apiDesign).toBeTruthy();
    expect(result.dbDesign).toBeTruthy();
  });
});
