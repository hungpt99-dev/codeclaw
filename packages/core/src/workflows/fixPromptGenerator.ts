export interface ParsedTestFailure {
  testName: string;
  suiteName: string | undefined;
  message: string;
  file: string | undefined;
  line: number | undefined;
}

export function generateFixPrompt(
  iteration: number,
  runTitle: string,
  previousDiff: string,
  testFailures: ParsedTestFailure[],
  reviewFindings: string,
  originalPrompt: string,
): string {
  const failuresText =
    testFailures.length > 0
      ? testFailures
          .map(
            (f) =>
              `- ${f.suiteName ? `${f.suiteName}.` : ""}${f.testName}: ${f.message.slice(0, 500)}`,
          )
          .join("\n")
      : "No test failures recorded.";

  return [
    `Iteration ${String(iteration)} fix for: ${runTitle}`,
    "",
    "Previous changes made:",
    previousDiff.trim() || "(No previous changes)",
    "",
    "Test failures to fix:",
    failuresText,
    "",
    "Review findings to address:",
    reviewFindings.trim() || "(No review findings)",
    "",
    "Original implementation prompt:",
    originalPrompt,
    "",
    "Fix only the issues listed above. Do not make unrelated changes.",
    "Run tests after fixing to confirm.",
  ].join("\n");
}
