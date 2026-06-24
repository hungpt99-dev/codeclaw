import { describe, it, expect } from "vitest";
import { parseFrontendPlannerOutput } from "./frontendPlannerOutputParser.js";

describe("parseFrontendPlannerOutput", () => {
  it("parses sections from structured output", () => {
    const raw = `## Component Tree
App > Header, Main, Footer

## State Management
Zustand store with auth, theme

## Routing Design
/ for home, /dashboard for app

## Data Fetching Strategy
React Query with stale-while-revalidate`;

    const result = parseFrontendPlannerOutput(raw, "test requirement");
    expect(result.componentTree).toContain("Header");
    expect(result.stateManagement).toContain("Zustand");
    expect(result.routingDesign).toContain("/dashboard");
    expect(result.dataFetchingStrategy).toContain("React Query");
  });

  it("provides fallback for missing sections", () => {
    const result = parseFrontendPlannerOutput("Some random text", "test req");
    expect(result.componentTree).toBeTruthy();
    expect(result.stateManagement).toBeTruthy();
    expect(result.routingDesign).toBeTruthy();
    expect(result.dataFetchingStrategy).toBeTruthy();
  });
});
