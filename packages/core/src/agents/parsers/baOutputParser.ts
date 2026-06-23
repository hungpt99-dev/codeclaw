interface BaParsedOutput {
  clarifiedRequirement: string;
  businessRules: string;
  acceptanceCriteria: string;
  openQuestions: string;
  assumptions: string;
}

const HEADINGS = [
  "Clarified Requirement",
  "Business Rules",
  "Acceptance Criteria",
  "Open Questions",
  "Assumptions",
];

function extractSection(raw: string, heading: string): string {
  const regex = new RegExp(
    `(?:^|\\n)##?\\s*${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=\\n##?\\s*(?:${HEADINGS.map(escapeRegExp).join("|")})\\s*\\n|$)`,
    "i",
  );
  const match = raw.match(regex);
  return match?.[1]?.trim() ?? "";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseBaOutput(raw: string, requirement: string): BaParsedOutput {
  const clarifiedRequirement = extractSection(raw, "Clarified Requirement") || raw;
  const businessRules = extractSection(raw, "Business Rules");
  const acceptanceCriteria = extractSection(raw, "Acceptance Criteria");
  const openQuestions = extractSection(raw, "Open Questions");
  const assumptions = extractSection(raw, "Assumptions");

  return {
    clarifiedRequirement: clarifiedRequirement || `# Clarified Requirement\n\n${requirement}`,
    businessRules: businessRules || "# Business Rules\n\nNo specific business rules extracted.",
    acceptanceCriteria:
      acceptanceCriteria || "# Acceptance Criteria\n\nNo specific acceptance criteria extracted.",
    openQuestions: openQuestions || "# Open Questions\n\nNo open questions identified.",
    assumptions: assumptions || "# Assumptions\n\nNo assumptions documented.",
  };
}
