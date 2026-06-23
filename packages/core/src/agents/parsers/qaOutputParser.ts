interface QaParsedOutput {
  testMatrixMd: string;
  testMatrixJson: string;
}

function extractSection(raw: string, heading: string): string {
  const regex = new RegExp(
    `(?:^|\\n)##?\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n##?\\s|$)`,
    "i",
  );
  const match = raw.match(regex);
  return match?.[1]?.trim() ?? "";
}

export function parseQaOutput(raw: string, requirement: string): QaParsedOutput {
  const matrix = extractSection(raw, "Test Matrix") || raw;

  const testMatrixMd = `# Test Matrix\n\n${matrix}`;

  const testMatrixJson = JSON.stringify(
    {
      requirement,
      unitTests: [],
      integrationTests: [],
      edgeCases: [],
      nonFunctionalTests: [],
    },
    null,
    2,
  );

  return { testMatrixMd, testMatrixJson };
}
