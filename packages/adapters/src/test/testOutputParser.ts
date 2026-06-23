export interface ParsedTestFailure {
  testName: string;
  suiteName: string | undefined;
  message: string;
  file: string | undefined;
  line: number | undefined;
}

const MAVEN_FAILURE_RE = /\s+([\w.]+)\(([\w.]+)\)/;
const MAVEN_RUN_SUMMARY_RE = /Tests run:\s*(\d+),\s*Failures:\s*(\d+)/;
const NPM_TEST_DOT_RE = /●\s+(.+)/;
const NPM_FAIL_RE = /(\S+)\.(\S+)\s*:/;
const GRADLE_FAIL_RE = /> Task\s+(:\S+)\s+FAILED/;
const GENERIC_ERROR_RE = /^.*ERROR\s+(.+)/i;

export function parseMavenOutput(output: string): ParsedTestFailure[] {
  const failures: ParsedTestFailure[] = [];
  const lines = output.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (line.includes("<<< FAILURE!")) {
      const prev = lines[i - 1];
      if (prev) {
        const match = MAVEN_FAILURE_RE.exec(prev);
        if (match) {
          failures.push({
            testName: match[1] ?? "unknown",
            suiteName: match[2],
            message: line,
            file: undefined,
            line: undefined,
          });
        }
      }
    }

    const runMatch = MAVEN_RUN_SUMMARY_RE.exec(line);
    if (runMatch) {
      const failureCount = parseInt(runMatch[2] ?? "0", 10);
      if (failureCount > 0) {
        const nextLines = lines.slice(i + 1, i + 20).join("\n");
        failures.push({
          testName: "test-suite",
          suiteName: "maven-surefire",
          message: `Tests run: ${runMatch[1] ?? "0"}, Failures: ${runMatch[2] ?? "0"}`,
          file: nextLines.slice(0, 200),
          line: undefined,
        });
      }
    }
  }

  return failures;
}

export function parseNpmOutput(output: string): ParsedTestFailure[] {
  const failures: ParsedTestFailure[] = [];
  const lines = output.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (line.includes("●")) {
      const testMatch = NPM_TEST_DOT_RE.exec(line);
      if (testMatch) {
        const testName = testMatch[1]?.trim() ?? "unknown";
        const detailLines: string[] = [];
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const dl = lines[j];
          if (dl?.includes("●")) break;
          if (dl) detailLines.push(dl);
        }
        failures.push({
          testName,
          suiteName: undefined,
          message: detailLines.join("\n").trim() || line,
          file: undefined,
          line: undefined,
        });
      }
    }

    if (line.includes("FAIL") && !line.includes("FAILED") && !line.includes("Tests:")) {
      const failMatch = NPM_FAIL_RE.exec(line);
      if (failMatch) {
        failures.push({
          suiteName: failMatch[1],
          testName: failMatch[2] ?? "unknown",
          message: line,
          file: undefined,
          line: undefined,
        });
      }
    }
  }

  return failures;
}

export function parseGradleOutput(output: string): ParsedTestFailure[] {
  const failures: ParsedTestFailure[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    if (line.includes("FAILED") && line.includes("> Task")) {
      const match = GRADLE_FAIL_RE.exec(line);
      if (match) {
        failures.push({
          testName: match[1] ?? "unknown",
          suiteName: "gradle",
          message: line,
          file: undefined,
          line: undefined,
        });
      }
    }
  }

  return failures;
}

export function parseGenericOutput(output: string): ParsedTestFailure[] {
  const failures: ParsedTestFailure[] = [
    ...parseMavenOutput(output),
    ...parseNpmOutput(output),
    ...parseGradleOutput(output),
  ];

  if (failures.length === 0) {
    const lines = output.split("\n");
    for (const line of lines) {
      const errorMatch = GENERIC_ERROR_RE.exec(line);
      if (errorMatch) {
        failures.push({
          testName: "error",
          suiteName: undefined,
          message: errorMatch[1] ?? line,
          file: undefined,
          line: undefined,
        });
      }
    }
  }

  return failures;
}
