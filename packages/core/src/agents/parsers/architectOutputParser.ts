interface ArchitectParsedOutput {
  technicalDesign: string;
  apiDesign: string;
  dbDesign: string;
}

const HEADINGS = ["Technical Design", "API Design", "Database Design"];

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

export function parseArchitectOutput(raw: string, requirement: string): ArchitectParsedOutput {
  const technicalDesign = extractSection(raw, "Technical Design");
  const apiDesign = extractSection(raw, "API Design");
  const dbDesign = extractSection(raw, "Database Design");

  return {
    technicalDesign: technicalDesign || `# Technical Design\n\nDesign for: ${requirement}`,
    apiDesign: apiDesign || "# API Design\n\nNo API design extracted.",
    dbDesign: dbDesign || "# Database Design\n\nNo database design extracted.",
  };
}
