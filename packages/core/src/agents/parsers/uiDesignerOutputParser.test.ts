import { describe, it, expect } from "vitest";
import { parseUiDesignerOutput } from "./uiDesignerOutputParser.js";

describe("parseUiDesignerOutput", () => {
  it("parses sections from structured output", () => {
    const raw = `## Screen Descriptions
Main screen with login form.

## Component Tree
LoginForm with email and password fields.

## States
Loading spinner during authentication.`;

    const result = parseUiDesignerOutput(raw, "test requirement");
    expect(result.screenDescriptions).toContain("login form");
    expect(result.componentTree).toContain("LoginForm");
    expect(result.states).toContain("Loading spinner");
  });

  it("provides fallback for missing sections", () => {
    const result = parseUiDesignerOutput("Some random text", "test req");
    expect(result.screenDescriptions).toBeTruthy();
    expect(result.componentTree).toBeTruthy();
    expect(result.states).toBeTruthy();
  });
});
