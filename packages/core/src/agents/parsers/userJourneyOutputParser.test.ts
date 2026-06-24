import { describe, it, expect } from "vitest";
import { parseUserJourneyOutput } from "./userJourneyOutputParser.js";

describe("parseUserJourneyOutput", () => {
  it("parses sections from structured output", () => {
    const raw = `## User Personas
| Name | Role | Goal |
|------|------|------|
| Alice | Admin | Manage |

## User Flows
1. User logs in
2. User views dashboard

## Journey Map
| Phase | User Action |
|-------|-------------|
| Login | Enters credentials |`;

    const result = parseUserJourneyOutput(raw, "test requirement");
    expect(result.userPersonas).toContain("Alice");
    expect(result.userFlows).toContain("User logs in");
    expect(result.journeyMap).toContain("Login");
  });

  it("provides fallback for missing sections", () => {
    const result = parseUserJourneyOutput("Some random text", "test req");
    expect(result.userPersonas).toBeTruthy();
    expect(result.userFlows).toBeTruthy();
    expect(result.journeyMap).toBeTruthy();
  });
});
