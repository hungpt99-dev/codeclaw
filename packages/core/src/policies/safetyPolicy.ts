function minimatch(filePath: string, pattern: string): boolean {
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "___GLOBSTAR___")
    .replace(/\*/g, "[^/]*")
    .replace(/___GLOBSTAR___/g, ".*");
  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(filePath);
}

export interface SafetyPolicy {
  denyFiles: string[];
  warnFiles: string[];
  denyCommands: string[];
  maxIterations: number;
  commandTimeoutSeconds: number;
}

export interface FileSafetyResult {
  blocked: string[];
  warnings: string[];
  safe: string[];
}

export interface FileRiskResult extends FileSafetyResult {
  requiresApproval: boolean;
}

export function checkFileSafety(changedFiles: string[], policy: SafetyPolicy): FileSafetyResult {
  const blocked: string[] = [];
  const warnings: string[] = [];
  const safe: string[] = [];

  for (const file of changedFiles) {
    const isBlocked = policy.denyFiles.some((pattern) => minimatch(file, pattern));
    if (isBlocked) {
      blocked.push(file);
      continue;
    }

    const isWarned = policy.warnFiles.some((pattern) => minimatch(file, pattern));
    if (isWarned) {
      warnings.push(file);
      continue;
    }

    safe.push(file);
  }

  return { blocked, warnings, safe };
}

export function checkFileRisk(changedFiles: string[], policy: SafetyPolicy): FileRiskResult {
  const result = checkFileSafety(changedFiles, policy);
  return {
    ...result,
    requiresApproval: result.blocked.length > 0 || result.warnings.length > 0,
  };
}

export function checkCommandSafety(command: string, denyCommands: string[]): boolean {
  return !denyCommands.some((denied) => command.includes(denied));
}

export function defaultSafetyPolicy(): SafetyPolicy {
  return {
    denyFiles: [".env", ".env.*", "*.pem", "*.key", "credentials.json"],
    warnFiles: ["pom.xml", "build.gradle", "package.json", "Dockerfile", ".github/workflows/*"],
    denyCommands: ["sudo", "rm -rf /", "chmod 777", "curl | sh", "wget | sh"],
    maxIterations: 3,
    commandTimeoutSeconds: 900,
  };
}
