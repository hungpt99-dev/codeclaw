interface SecurityReviewerParsedOutput {
  securityReview: string;
  securityStatus: "SECURE" | "MINOR_ISSUES" | "CRITICAL_ISSUES";
}

function extractSecurityStatus(raw: string): SecurityReviewerParsedOutput["securityStatus"] {
  const pattern = /\b(SECURE|MINOR_ISSUES|CRITICAL_ISSUES)\b/i;
  const match = pattern.exec(raw);
  const captured = match?.[1];
  if (captured) {
    const val = captured.toUpperCase();
    if (val === "SECURE" || val === "MINOR_ISSUES" || val === "CRITICAL_ISSUES") {
      return val;
    }
  }
  return "MINOR_ISSUES";
}

export function parseSecurityReviewerOutput(
  raw: string,
  _requirement: string,
): SecurityReviewerParsedOutput {
  const securityReview = raw.trim() || "# Security Review Report\n\nNo security review generated.";
  const securityStatus = extractSecurityStatus(raw);

  return {
    securityReview,
    securityStatus,
  };
}
