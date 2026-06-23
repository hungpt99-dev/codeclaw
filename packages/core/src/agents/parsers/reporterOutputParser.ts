interface ReporterParsedOutput {
  finalReport: string;
}

function extractSection(raw: string, heading: string): string {
  const regex = new RegExp(
    `(?:^|\\n)##?\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n##?\\s|$)`,
    "i",
  );
  const match = raw.match(regex);
  return match?.[1]?.trim() ?? "";
}

export function parseReporterOutput(raw: string): ReporterParsedOutput {
  const report = extractSection(raw, "Final Report") || raw;
  return { finalReport: `# Final Report\n\n${report}` };
}
