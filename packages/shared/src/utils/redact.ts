const SECRET_PATTERNS: RegExp[] = [
  /(api[_-]?key|apikey)\s*[=:]\s*['"]?\w+['"]?/gi,
  /(bearer|token)\s+\w+/gi,
  /xox[baprs]-[0-9a-zA-Z-]+/g,
  /(oauth|auth)[_-]?token[_-]?\w*\s*[=:]\s*\S+/gi,
  /(session|access|refresh)[_-]?token\s*[=:]\s*\S+/gi,
  /token\s*[=:]\s*\w{4,}/gi,
  /postgres:\/\/\w+:\w+@/g,
  /mysql:\/\/\w+:\w+@/g,
  /mongodb:\/\/\w+:\w+@/g,
  /redis:\/\/:\w+@/g,
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (RSA |EC )?PRIVATE KEY-----/g,
  /session[_-]?token\s*[=:]\s*\S+/gi,
];

export function redactSecrets(input: string): string {
  let result = input;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, (match: string) => {
      const lines = match.split("\n");
      if (lines.length > 2 && match.includes("PRIVATE KEY")) {
        const first = lines[0] ?? "";
        const last = lines[lines.length - 1] ?? "";
        return first + "\n[REDACTED]\n" + last;
      }
      const parts = match.split(/[=:]\s*/);
      if (parts.length >= 2) {
        const key = parts[0] ?? "";
        return key + "= [REDACTED]";
      }
      return "[REDACTED]";
    });
  }
  return result;
}
