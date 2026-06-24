interface CodeReviewerParsedOutput {
  reviewReport: string;
  requirementCoverage: string;
  overallStatus: "APPROVED" | "APPROVED_WITH_WARNINGS" | "CHANGES_REQUIRED";
}

const ALL_HEADINGS = [
  "Review Summary",
  "Requirement Coverage",
  "Code Quality",
  "Test Quality",
  "Security",
  "Required Fixes",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSection(raw: string, heading: string): string {
  const regex = new RegExp(
    `(?:^|\\n)##?\\s*${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=\\n##?\\s*(?:${ALL_HEADINGS.map(escapeRegExp).join("|")})\\s*\\n|$)`,
    "i",
  );
  const match = raw.match(regex);
  return match?.[1]?.trim() ?? "";
}

function extractOverallStatus(raw: string): CodeReviewerParsedOutput["overallStatus"] {
  const pattern = /\b(APPROVED(?:_WITH_WARNINGS)?|CHANGES_REQUIRED)\b/i;
  const match = pattern.exec(raw);
  const captured = match?.[1];
  if (captured) {
    const val = captured.toUpperCase();
    if (val === "APPROVED" || val === "APPROVED_WITH_WARNINGS") {
      return val;
    }
    return "CHANGES_REQUIRED";
  }
  return "CHANGES_REQUIRED";
}

export function parseCodeReviewerOutput(
  raw: string,
  _requirement: string,
): CodeReviewerParsedOutput {
  const reviewReport = raw.trim() || "# Review Report\n\nNo review generated.";
  const requirementCoverage =
    extractSection(raw, "Requirement Coverage") || "Requirement Coverage section not available";
  const overallStatus = extractOverallStatus(raw);

  return {
    reviewReport,
    requirementCoverage,
    overallStatus,
  };
}
