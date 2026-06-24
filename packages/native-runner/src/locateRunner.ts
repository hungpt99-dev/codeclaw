import { execFile } from "node:child_process";
import { promisify } from "node:util";

const asyncExecFile = promisify(execFile);

const CANDIDATE_PATHS = [
  "codeclaw-runner",
  "./codeclaw-runner",
  "./target/release/codeclaw-runner",
  "./target/debug/codeclaw-runner",
];

export async function locateRunner(customPath?: string): Promise<string | null> {
  const paths = customPath ? [customPath, ...CANDIDATE_PATHS] : CANDIDATE_PATHS;

  for (const candidate of paths) {
    try {
      await asyncExecFile("which", [candidate], { timeout: 3000 });
      return candidate;
    } catch {
      continue;
    }
  }

  try {
    await asyncExecFile("which", ["codeclaw-runner"], { timeout: 3000 });
    return "codeclaw-runner";
  } catch {
    return null;
  }
}
