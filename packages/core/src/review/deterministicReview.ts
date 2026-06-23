export interface DeterministicReviewInput {
  acceptanceCriteria: string;
  changedFiles: string;
  diff: string;
  testResults: string;
  clarifiedRequirement: string;
}

export interface DeterministicReviewOutput {
  reviewReport: string;
  securityReview: string;
  requirementCoverage: string;
  overallStatus: "APPROVED" | "APPROVED_WITH_WARNINGS" | "CHANGES_REQUIRED";
}

function parseAcceptanceCriteria(acText: string): string[] {
  const lines = acText.split("\n");
  const criteria: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*]\s|^\d+[.)]\s/.test(trimmed) && trimmed.length > 3) {
      criteria.push(trimmed.replace(/^[-*]\s|^\d+[.)]\s/, ""));
    }
  }
  return criteria.length > 0 ? criteria : ["No specific criteria found"];
}

function parseTestResults(testResults: string): {
  passed: number;
  failed: number;
  total: number;
} {
  const passed = (testResults.match(/PASSED|passed|✓|✅/g) ?? []).length;
  const failed = (testResults.match(/FAILED|failed|✗|❌/g) ?? []).length;
  const total = passed + failed || 1;
  return { passed, failed, total };
}

function parseChangedFiles(changedFiles: string): string[] {
  try {
    const parsed: unknown = JSON.parse(changedFiles);
    if (Array.isArray(parsed)) return parsed as string[];
    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.files)) return obj.files as string[];
    }
    return [];
  } catch {
    return changedFiles
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));
  }
}

const SENSITIVE_PATTERNS = [
  /secret/i,
  /password/i,
  /token/i,
  /api.?key/i,
  /credential/i,
  /.env/,
  /private.?key/i,
  /\.pem$/,
  /\.cert$/,
  /\.secret$/,
];

function checkSensitiveFiles(files: string[]): string[] {
  return files.filter((f) => SENSITIVE_PATTERNS.some((p) => p.test(f)));
}

function countLines(diff: string): number {
  return diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
}

function countFiles(diff: string): number {
  const files = diff.match(/^\+\+\+\s/gm);
  return files ? files.length : 0;
}

export function generateDeterministicReview(
  input: DeterministicReviewInput,
): DeterministicReviewOutput {
  const criteria = parseAcceptanceCriteria(input.acceptanceCriteria);
  const testStats = parseTestResults(input.testResults);
  const files = parseChangedFiles(input.changedFiles);
  const sensitiveFiles = checkSensitiveFiles(files);
  const locChanged = countLines(input.diff);
  const fileCount = countFiles(input.diff);

  const coverageRows = criteria
    .map((c, i) => {
      const hasTest = input.testResults.toLowerCase().includes(c.toLowerCase().slice(0, 20));
      const status = hasTest ? "COVERED" : "NOT_COVERED";
      return `| AC-${String(i + 1)} | ${status} | ${c.slice(0, 60)} |`;
    })
    .join("\n");

  const passedRate =
    testStats.total > 0 ? ((testStats.passed / testStats.total) * 100).toFixed(0) : "0";
  const failedRate =
    testStats.total > 0 ? ((testStats.failed / testStats.total) * 100).toFixed(0) : "0";

  const qualityIssues: string[] = [];
  if (fileCount === 0) {
    qualityIssues.push("No files changed in the diff");
  }
  if (locChanged > 500) {
    qualityIssues.push(`Large diff: ${String(locChanged)} lines changed — consider splitting`);
  }
  if (files.length > 20) {
    qualityIssues.push(`Many files changed (${String(files.length)}) — ensure changes are focused`);
  }
  if (qualityIssues.length === 0) {
    qualityIssues.push("No obvious code quality issues detected");
  }

  const testIssues: string[] = [];
  if (testStats.total === 0 || (testStats.passed === 0 && testStats.failed === 0)) {
    testIssues.push("No test results available — verify tests exist for new code");
  } else {
    if (testStats.failed > 0) {
      testIssues.push(`${String(testStats.failed)} test(s) failing`);
    }
    if (testStats.passed > 0) {
      testIssues.push(`${String(testStats.passed)} test(s) passing`);
    }
    if (criteria.length > testStats.total) {
      testIssues.push(
        `Only ${String(testStats.total)} test(s) for ${String(criteria.length)} criteria — consider adding more tests`,
      );
    }
  }
  if (testIssues.length === 0) {
    testIssues.push("Test quality appears acceptable");
  }

  const securityIssues: string[] = [];
  if (sensitiveFiles.length > 0) {
    securityIssues.push(
      `Sensitive file patterns detected: ${sensitiveFiles.join(", ")} — review for secrets exposure`,
    );
  } else {
    securityIssues.push("No sensitive file patterns detected");
  }
  if (input.diff.includes(".env")) {
    securityIssues.push("Diff references .env files — verify no secrets committed");
  }

  const hasFailingTests = testStats.failed > 0;
  const hasSensitiveChanges = sensitiveFiles.length > 0;
  const noTests = testStats.total === 0;

  let overallStatus: DeterministicReviewOutput["overallStatus"];
  if (hasFailingTests || hasSensitiveChanges) {
    overallStatus = "CHANGES_REQUIRED";
  } else if (noTests || locChanged > 500) {
    overallStatus = "APPROVED_WITH_WARNINGS";
  } else {
    overallStatus = "APPROVED";
  }

  const reviewReport = `# Review Report

## Review Summary
**${overallStatus}**

## Requirement Coverage
| Criteria | Status | Notes |
|----------|--------|-------|
${coverageRows}

## Code Quality
${qualityIssues.map((i) => `- ${i}`).join("\n")}

## Test Quality
${testIssues.map((i) => `- ${i}`).join("\n")}
- Pass rate: ${passedRate}% (${String(testStats.passed)}/${String(testStats.total)})
- Fail rate: ${failedRate}% (${String(testStats.failed)}/${String(testStats.total)})

## Security
${securityIssues.map((i) => `- ${i}`).join("\n")}

## Summary
- Files changed: ${String(files.length)}
- Lines changed: ${String(locChanged)}
- Tests: ${String(testStats.total)} (${String(testStats.passed)} passed, ${String(testStats.failed)} failed)
`;

  const securityReview = `# Security Review Report

## Security Review Summary
${sensitiveFiles.length > 0 ? "MINOR_ISSUES" : "SECURE"}

## Vulnerabilities Found
| Severity | Issue | File | Recommendation |
|----------|-------|------|----------------|
${sensitiveFiles.length > 0 ? sensitiveFiles.map((f) => `| MEDIUM | Sensitive file pattern | ${f} | Verify no secrets or credentials are exposed |`).join("\n") : "| INFO | No vulnerabilities detected | — | — |"}

## Critical Issues
${sensitiveFiles.length > 0 ? "1. Review sensitive file patterns for credential exposure" : "None"}

## Recommendations
1. Ensure all secrets are stored in environment variables
2. Verify .gitignore includes common secret file patterns
3. Run a dependency vulnerability scanner before deployment
`;

  const requirementCoverage = `# Requirement Coverage Report

## Coverage Summary
| Metric | Value |
|--------|-------|
| Total Criteria | ${String(criteria.length)} |
| Covered | ${String(criteria.filter((_, i) => input.testResults.toLowerCase().includes(criteria[i]?.toLowerCase().slice(0, 20) ?? "")).length)} |
| Not Covered | ${String(criteria.filter((_, i) => !input.testResults.toLowerCase().includes(criteria[i]?.toLowerCase().slice(0, 20) ?? "")).length)} |

## Acceptance Criteria Coverage
${coverageRows}
`;

  return {
    reviewReport,
    securityReview,
    requirementCoverage,
    overallStatus,
  };
}
