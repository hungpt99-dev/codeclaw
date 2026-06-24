interface IntegrationPlannerParsedOutput {
  integrationPlan: string;
}

const HEADINGS = ["Integration Plan"];

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

export function parseIntegrationPlannerOutput(
  raw: string,
  requirement: string,
): IntegrationPlannerParsedOutput {
  const integrationPlan = extractSection(raw, "Integration Plan");

  return {
    integrationPlan:
      integrationPlan || `# Integration Plan\n\nIntegration plan for: ${requirement}`,
  };
}
