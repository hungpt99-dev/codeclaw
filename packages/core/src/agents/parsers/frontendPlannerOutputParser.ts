interface FrontendPlannerParsedOutput {
  componentTree: string;
  stateManagement: string;
  routingDesign: string;
  dataFetchingStrategy: string;
}

const HEADINGS = ["Component Tree", "State Management", "Routing Design", "Data Fetching Strategy"];

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

export function parseFrontendPlannerOutput(
  raw: string,
  requirement: string,
): FrontendPlannerParsedOutput {
  const componentTree = extractSection(raw, "Component Tree");
  const stateManagement = extractSection(raw, "State Management");
  const routingDesign = extractSection(raw, "Routing Design");
  const dataFetchingStrategy = extractSection(raw, "Data Fetching Strategy");

  return {
    componentTree: componentTree || `# Component Tree\n\nComponent design for: ${requirement}`,
    stateManagement:
      stateManagement || "# State Management\n\nNo state management design extracted.",
    routingDesign: routingDesign || "# Routing Design\n\nNo routing design extracted.",
    dataFetchingStrategy:
      dataFetchingStrategy || "# Data Fetching Strategy\n\nNo data fetching strategy extracted.",
  };
}
