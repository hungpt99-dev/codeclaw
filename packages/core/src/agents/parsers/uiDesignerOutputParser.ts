interface UiDesignerParsedOutput {
  screenDescriptions: string;
  componentTree: string;
  states: string;
}

const HEADINGS = ["Screen Descriptions", "Component Tree", "States"];

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

export function parseUiDesignerOutput(raw: string, requirement: string): UiDesignerParsedOutput {
  const screenDescriptions = extractSection(raw, "Screen Descriptions");
  const componentTree = extractSection(raw, "Component Tree");
  const states = extractSection(raw, "States");

  return {
    screenDescriptions:
      screenDescriptions || `# Screen Descriptions\n\nNo screen descriptions for: ${requirement}`,
    componentTree: componentTree || "# Component Tree\n\nNo component tree extracted.",
    states: states || "# States\n\nNo states extracted.",
  };
}
