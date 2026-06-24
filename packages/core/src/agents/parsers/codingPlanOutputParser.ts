interface CodingPlanParsedOutput {
  codingPlanMd: string;
}

function extractSection(raw: string, heading: string): string {
  const regex = new RegExp(
    `(?:^|\\n)##?\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n##?\\s|$)`,
    "i",
  );
  const match = raw.match(regex);
  return match?.[1]?.trim() ?? "";
}

export function parseCodingPlanOutput(raw: string): CodingPlanParsedOutput {
  const plan = extractSection(raw, "Coding Plan") || raw;
  return { codingPlanMd: `# Coding Plan\n\n${plan}` };
}
