interface BackendPlannerParsedOutput {
  serviceLayer: string;
  controllerDesign: string;
  middlewareChain: string;
  errorHandlingStrategy: string;
}

const HEADINGS = [
  "Service Layer",
  "Controller Design",
  "Middleware Chain",
  "Error Handling Strategy",
];

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

export function parseBackendPlannerOutput(
  raw: string,
  requirement: string,
): BackendPlannerParsedOutput {
  const serviceLayer = extractSection(raw, "Service Layer");
  const controllerDesign = extractSection(raw, "Controller Design");
  const middlewareChain = extractSection(raw, "Middleware Chain");
  const errorHandlingStrategy = extractSection(raw, "Error Handling Strategy");

  return {
    serviceLayer: serviceLayer || `# Service Layer\n\nService design for: ${requirement}`,
    controllerDesign: controllerDesign || "# Controller Design\n\nNo controller design extracted.",
    middlewareChain: middlewareChain || "# Middleware Chain\n\nNo middleware chain extracted.",
    errorHandlingStrategy:
      errorHandlingStrategy || "# Error Handling Strategy\n\nNo error handling strategy extracted.",
  };
}
