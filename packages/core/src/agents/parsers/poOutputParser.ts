interface PoParsedOutput {
  productGoal: string;
  mvpScope: string;
  outOfScope: string;
  successCriteria: string;
}

const HEADINGS = ["Product Goal", "MVP Scope", "Out of Scope", "Success Criteria"];

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

export function parsePoOutput(raw: string): PoParsedOutput {
  const productGoal = extractSection(raw, "Product Goal") || raw;
  const mvpScope = extractSection(raw, "MVP Scope");
  const outOfScope = extractSection(raw, "Out of Scope");
  const successCriteria = extractSection(raw, "Success Criteria");

  return {
    productGoal: productGoal || "# Product Goal\n\nNo product goal defined.",
    mvpScope: mvpScope || "# MVP Scope\n\nNo MVP scope defined.",
    outOfScope: outOfScope || "# Out of Scope\n\nNothing explicitly out of scope.",
    successCriteria: successCriteria || "# Success Criteria\n\nNo success criteria defined.",
  };
}
