interface UxWriterParsedOutput {
  interfaceLabels: string;
  errorMessages: string;
  emptyStateText: string;
  tooltips: string;
}

const HEADINGS = ["Interface Labels", "Error Messages", "Empty State Text", "Tooltips & Help Text"];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSection(raw: string, heading: string): string {
  const regex = new RegExp(
    `(?:^|\\n)##?\\s*${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=\\n##?\\s*(?:${HEADINGS.map(escapeRegExp).join("|")})\\s*\\n|$)`,
    "i",
  );
  const match = raw.match(regex);
  return match?.[1]?.trim() ?? "";
}

export function parseUxWriterOutput(raw: string, requirement: string): UxWriterParsedOutput {
  const interfaceLabels = extractSection(raw, "Interface Labels");
  const errorMessages = extractSection(raw, "Error Messages");
  const emptyStateText = extractSection(raw, "Empty State Text");
  const tooltips = extractSection(raw, "Tooltips & Help Text");

  return {
    interfaceLabels:
      interfaceLabels || `# Interface Labels\n\nNo interface labels for: ${requirement}`,
    errorMessages: errorMessages || "# Error Messages\n\nNo error messages extracted.",
    emptyStateText: emptyStateText || "# Empty State Text\n\nNo empty state text extracted.",
    tooltips: tooltips || "# Tooltips & Help Text\n\nNo tooltips extracted.",
  };
}
