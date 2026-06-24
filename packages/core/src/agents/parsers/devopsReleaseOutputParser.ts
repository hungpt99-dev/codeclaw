interface DevopsReleaseParsedOutput {
  releasePlan: string;
  changelog: string;
}

const HEADINGS = ["Release Plan", "Changelog"];

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

export function parseDevopsReleaseOutput(
  raw: string,
  requirement: string,
): DevopsReleaseParsedOutput {
  const releasePlan = extractSection(raw, "Release Plan");
  const changelog = extractSection(raw, "Changelog");

  return {
    releasePlan: releasePlan || `# Release Plan\n\nRelease plan for: ${requirement}`,
    changelog: changelog || `# Changelog\n\nChangelog for: ${requirement}`,
  };
}
