interface TechnicalDocParsedOutput {
  apiReference: string;
  setupGuide: string;
  technicalReference: string;
  operationsGuide: string;
}

const HEADINGS = ["API Reference", "Setup Guide", "Technical Reference", "Operations Guide"];

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

export function parseTechnicalDocOutput(
  raw: string,
  requirement: string,
): TechnicalDocParsedOutput {
  const apiReference = extractSection(raw, "API Reference");
  const setupGuide = extractSection(raw, "Setup Guide");
  const technicalReference = extractSection(raw, "Technical Reference");
  const operationsGuide = extractSection(raw, "Operations Guide");

  return {
    apiReference: apiReference || `# API Reference\n\nAPI documentation for: ${requirement}`,
    setupGuide:
      setupGuide || `# Setup Guide\n\nInstallation and configuration guide for: ${requirement}`,
    technicalReference:
      technicalReference || `# Technical Reference\n\nArchitecture overview for: ${requirement}`,
    operationsGuide:
      operationsGuide ||
      `# Operations Guide\n\nDeployment and maintenance guide for: ${requirement}`,
  };
}
