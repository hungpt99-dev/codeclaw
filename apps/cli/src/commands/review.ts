import { join } from "node:path";
import { access } from "node:fs/promises";
import { loadAndReview, persistReview, getArtifactPaths } from "@aiteam/core";

interface ReviewCliOptions {
  run: string;
  security?: boolean;
  coverage?: boolean;
  all?: boolean;
  regenerate?: boolean;
}

function ensureRunId(options: ReviewCliOptions): string {
  if (options.run) return options.run;
  throw new Error("--run <runId> is required");
}

export async function reviewCommand(options: ReviewCliOptions): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".ai-team");
  try {
    await access(aiTeamDir);
  } catch {
    console.log(".ai-team not found. Run 'aiteam init' first.");
    process.exit(1);
  }

  const runId = ensureRunId(options);
  const runSecurity = options.security ?? false;
  const runCoverage = options.coverage ?? false;
  const runAll = options.all ?? (!runSecurity && !runCoverage);
  const regenerate = options.regenerate ?? false;

  const paths = getArtifactPaths(runId);

  if (!regenerate) {
    const { readFile } = await import("node:fs/promises");
    let hasExisting = false;

    if (runAll || runCoverage) {
      try {
        const content = await readFile(paths.requirementCoveragePath, "utf-8");
        console.log("\n=== Requirement Coverage ===\n");
        console.log(content);
        hasExisting = true;
      } catch {
        /* not found */
      }
    }

    if (runAll || runSecurity) {
      try {
        const content = await readFile(paths.securityReviewPath, "utf-8");
        console.log("\n=== Security Review ===\n");
        console.log(content);
        hasExisting = true;
      } catch {
        /* not found */
      }
    }

    if (runAll) {
      try {
        const content = await readFile(paths.reviewReportPath, "utf-8");
        console.log("\n=== Review Report ===\n");
        console.log(content);
        hasExisting = true;
      } catch {
        /* not found */
      }
    }

    if (hasExisting) {
      console.log("\nUse --regenerate to re-run the review.");
      return;
    }
  }

  console.log(`Running review for run: ${runId}...`);

  const result = await loadAndReview(runId);

  const persisted = await persistReview(runId, result);

  console.log(`\nReview complete. Status: ${result.overallStatus}`);

  if (runAll || runCoverage) {
    console.log(`\n=== Requirement Coverage ===\n${result.requirementCoverage}`);
  }

  if (runAll || runSecurity) {
    console.log(`\n=== Security Review ===\n${result.securityReview}`);
  }

  if (runAll) {
    console.log(`\n=== Review Report ===\n${result.reviewReport}`);
  }

  console.log("\nArtifacts written:");
  console.log(`  Review Report:      ${persisted.reviewReportPath}`);
  console.log(`  Security Review:    ${persisted.securityReviewPath}`);
  console.log(`  Requirement Coverage: ${persisted.requirementCoveragePath}`);
}
