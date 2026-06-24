interface TraceabilityAgentOutput {
  coverageAnalysis: string;
  gapDetection: string;
  recommendations: string;
}

function extractSection(raw: string, heading: string): string {
  const regex = new RegExp(
    `(?:^|\\n)##?\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n##?\\s|$)`,
    "i",
  );
  const match = raw.match(regex);
  return match?.[1]?.trim() ?? "";
}

export function parseTraceabilityOutput(raw: string): TraceabilityAgentOutput {
  return {
    coverageAnalysis: extractSection(raw, "Coverage Analysis") || "No coverage analysis provided.",
    gapDetection: extractSection(raw, "Gap Detection") || "No gap detection provided.",
    recommendations: extractSection(raw, "Recommendations") || "No recommendations provided.",
  };
}
