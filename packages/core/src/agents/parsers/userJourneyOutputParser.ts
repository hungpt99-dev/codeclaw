interface UserJourneyParsedOutput {
  userPersonas: string;
  userFlows: string;
  journeyMap: string;
}

const HEADINGS = ["User Personas", "User Flows", "Journey Map"];

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

export function parseUserJourneyOutput(raw: string, requirement: string): UserJourneyParsedOutput {
  const userPersonas = extractSection(raw, "User Personas");
  const userFlows = extractSection(raw, "User Flows");
  const journeyMap = extractSection(raw, "Journey Map");

  return {
    userPersonas: userPersonas || `# User Personas\n\nNo personas extracted for: ${requirement}`,
    userFlows: userFlows || "# User Flows\n\nNo user flows extracted.",
    journeyMap: journeyMap || "# Journey Map\n\nNo journey map extracted.",
  };
}
