import { describe, it, expect } from "vitest";
import { parseUxWriterOutput } from "./uxWriterOutputParser.js";

describe("parseUxWriterOutput", () => {
  it("parses sections from structured output", () => {
    const raw = `## Interface Labels
Submit button labeled "Save".

## Error Messages
Validation error shown on empty field.

## Empty State Text
No items yet message.

## Tooltips & Help Text
Help icon tooltip for input field.`;

    const result = parseUxWriterOutput(raw, "test requirement");
    expect(result.interfaceLabels).toContain("Save");
    expect(result.errorMessages).toContain("Validation error");
    expect(result.emptyStateText).toContain("No items yet");
    expect(result.tooltips).toContain("Help icon");
  });

  it("provides fallback for missing sections", () => {
    const result = parseUxWriterOutput("Some random text", "test req");
    expect(result.interfaceLabels).toBeTruthy();
    expect(result.errorMessages).toBeTruthy();
    expect(result.emptyStateText).toBeTruthy();
    expect(result.tooltips).toBeTruthy();
  });
});
