export interface DeterministicReviewInput {
  acceptanceCriteria: string;
  changedFiles: string;
  diff: string;
  testResults: string;
  clarifiedRequirement: string;
}

export interface DeterministicCodeReviewOutput {
  reviewReport: string;
  requirementCoverage: string;
  overallStatus: "APPROVED" | "APPROVED_WITH_WARNINGS" | "CHANGES_REQUIRED";
}

export interface DeterministicSecurityReviewOutput {
  securityReview: string;
  securityStatus: "SECURE" | "MINOR_ISSUES" | "CRITICAL_ISSUES";
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

const DANGEROUS_FUNCTION_PATTERNS = [
  /eval\s*\(/,
  /exec\s*\(/,
  /spawn\s*\(/,
  /unescape\(/,
  /innerHTML\s*=/,
  /dangerouslySetInnerHTML/,
  /new Function\(/,
  /child_process/,
  /process\.env/,
];

const UNPROTECTED_ENDPOINT_PATTERNS = [
  /app\.(get|post|put|delete|patch)\s*\(\s*["'`]\/api\/(?!auth)/i,
  /router\.(get|post|put|delete|patch)\s*\(\s*["'`]\/api\/(?!auth)/i,
  /@(Get|Post|Put|Delete|Patch)\(/,
];

function checkDangerousFunctions(diff: string): string[] {
  return DANGEROUS_FUNCTION_PATTERNS.filter((p) => p.test(diff)).map(
    (p) => `Potential dangerous pattern: ${p.source}`,
  );
}

function checkUnprotectedEndpoints(diff: string): string[] {
  return UNPROTECTED_ENDPOINT_PATTERNS.filter((p) => p.test(diff)).map(
    (p) => `Potential unprotected endpoint pattern: ${p.source}`,
  );
}

function countLines(diff: string): number {
  return diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
}

function countFiles(diff: string): number {
  const files = diff.match(/^\+\+\+\s/gm);
  return files ? files.length : 0;
}

export function generateDeterministicCodeReview(
  input: DeterministicReviewInput,
): DeterministicCodeReviewOutput {
  const criteria = parseAcceptanceCriteria(input.acceptanceCriteria);
  const testStats = parseTestResults(input.testResults);
  const files = parseChangedFiles(input.changedFiles);
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
  const sensitiveFiles = checkSensitiveFiles(files);
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
  const noTests = testStats.total === 0;

  let overallStatus: DeterministicCodeReviewOutput["overallStatus"];
  if (hasFailingTests || sensitiveFiles.length > 0) {
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
    requirementCoverage,
    overallStatus,
  };
}

export function generateDeterministicSecurityReview(
  input: DeterministicReviewInput,
): DeterministicSecurityReviewOutput {
  const files = parseChangedFiles(input.changedFiles);
  const sensitiveFiles = checkSensitiveFiles(files);
  const dangerousFunctions = checkDangerousFunctions(input.diff);
  const unprotectedEndpoints = checkUnprotectedEndpoints(input.diff);

  const allIssues: { severity: string; issue: string; file: string; recommendation: string }[] = [];

  for (const f of sensitiveFiles) {
    allIssues.push({
      severity: "MEDIUM",
      issue: "Sensitive file pattern detected",
      file: f,
      recommendation: "Verify no secrets or credentials are exposed",
    });
  }

  for (const func of dangerousFunctions) {
    allIssues.push({
      severity: "HIGH",
      issue: func,
      file: "diff",
      recommendation: "Review usage of dangerous functions; consider safer alternatives",
    });
  }

  for (const endpoint of unprotectedEndpoints) {
    allIssues.push({
      severity: "MEDIUM",
      issue: endpoint,
      file: "diff",
      recommendation: "Ensure authentication/authorization is applied to this endpoint",
    });
  }

  if (input.diff.includes("hardcoded") || /\bsecret\b\s*[:=]\s*["']/.test(input.diff)) {
    allIssues.push({
      severity: "HIGH",
      issue: "Potential hardcoded secret in code",
      file: "diff",
      recommendation: "Move secrets to environment variables",
    });
  }

  let securityStatus: DeterministicSecurityReviewOutput["securityStatus"];
  const hasCritical = allIssues.some((i) => i.severity === "HIGH");
  const hasMedium = allIssues.some((i) => i.severity === "MEDIUM");
  if (hasCritical) {
    securityStatus = "CRITICAL_ISSUES";
  } else if (hasMedium) {
    securityStatus = "MINOR_ISSUES";
  } else {
    securityStatus = "SECURE";
  }

  const vulnerabilityRows =
    allIssues.length > 0
      ? allIssues
          .map((i) => `| ${i.severity} | ${i.issue} | ${i.file} | ${i.recommendation} |`)
          .join("\n")
      : "| INFO | No vulnerabilities detected | — | — |";

  const criticalIssues = allIssues
    .filter((i) => i.severity === "HIGH")
    .map((i, idx) => `${String(idx + 1)}. ${i.issue} in ${i.file}: ${i.recommendation}`);
  const criticalSection = criticalIssues.length > 0 ? criticalIssues.join("\n") : "None";

  const recommendations: string[] = [];
  if (sensitiveFiles.length > 0) {
    recommendations.push("Review sensitive file patterns for credential exposure");
  }
  if (dangerousFunctions.length > 0) {
    recommendations.push("Replace dangerous function calls with safer alternatives");
  }
  if (unprotectedEndpoints.length > 0) {
    recommendations.push("Add authentication/authorization middleware to unprotected endpoints");
  }
  recommendations.push("Ensure all secrets are stored in environment variables");
  recommendations.push("Verify .gitignore includes common secret file patterns");
  recommendations.push("Run a dependency vulnerability scanner before deployment");

  const securityReview = `# Security Review Report

## Security Review Summary
${securityStatus}

## Vulnerabilities Found
| Severity | Issue | File | Recommendation |
|----------|-------|------|----------------|
${vulnerabilityRows}

## Critical Issues
${criticalSection}

## Recommendations
${recommendations.map((r, idx) => `${String(idx + 1)}. ${r}`).join("\n")}
`;

  return {
    securityReview,
    securityStatus,
  };
}
