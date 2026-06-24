import { join } from "node:path";
import { readFile } from "node:fs/promises";
import type { Config } from "@codeclaw/shared";

interface TestCliOptions {
  run: string;
  build?: boolean;
  unit?: boolean;
  integration?: boolean;
  lint?: boolean;
  all?: boolean;
  command?: string;
}

export async function testCommand(options: TestCliOptions): Promise<void> {
  const runId = options.run;
  if (!runId) {
    console.error("Error: --run <runId> is required");
    process.exit(2);
  }

  let config: Config;
  try {
    const configPath = join(".codeclaw", "config.json");
    const raw = await readFile(configPath, "utf-8");
    config = JSON.parse(raw) as Config;
  } catch {
    console.error("Error: Project not initialized. Run: codeclaw init");
    process.exit(3);
  }

  const cmds = config.commands;

  const commands: { name: string; command: string }[] = [];

  if (
    options.all ||
    (!options.build && !options.unit && !options.integration && !options.lint && !options.command)
  ) {
    if (cmds.build) commands.push({ name: "build", command: cmds.build });
    if (cmds.unitTest) commands.push({ name: "unitTest", command: cmds.unitTest });
    if (cmds.integrationTest)
      commands.push({ name: "integrationTest", command: cmds.integrationTest });
    if (cmds.lint) commands.push({ name: "lint", command: cmds.lint });
  } else {
    if (options.build && cmds.build) commands.push({ name: "build", command: cmds.build });
    if (options.unit && cmds.unitTest) commands.push({ name: "unitTest", command: cmds.unitTest });
    if (options.integration && cmds.integrationTest)
      commands.push({ name: "integrationTest", command: cmds.integrationTest });
    if (options.lint && cmds.lint) commands.push({ name: "lint", command: cmds.lint });
  }

  if (options.command) {
    commands.push({ name: "custom", command: options.command });
  }

  if (commands.length === 0) {
    console.log("No test commands configured. Set commands in .codeclaw/config.json.");
    process.exit(0);
  }

  console.log(`Running tests for run: ${runId}\n`);

  const timeout = config.safety.commandTimeoutSeconds;
  const testDir = join(".codeclaw", "runs", runId, "tests");

  const { runTests, writeTestResultArtifacts } = await import("@codeclaw/adapters");

  const testRun = await runTests(
    commands.map((c) => ({
      name: c.name,
      command: c.command,
      cwd: process.cwd(),
      timeoutSeconds: timeout,
    })),
    testDir,
  );

  const artifacts = await writeTestResultArtifacts(testRun, testDir);

  console.log(`Status: ${testRun.overallStatus}\n`);

  for (const r of testRun.results) {
    const icon = r.passed ? "✓" : "✗";
    const timeoutLabel = r.timedOut ? " (TIMEOUT)" : "";
    console.log(
      `  ${icon} ${r.commandName}: exit ${String(r.exitCode ?? "null")}${timeoutLabel} (${(r.durationMs / 1000).toFixed(1)}s)`,
    );
  }

  console.log(`\nArtifacts:`);
  console.log(`  ${artifacts.testResultPath}`);
  console.log(`  ${artifacts.failedTestsPath}`);

  if (testRun.overallStatus !== "PASSED") {
    process.exit(8);
  }
}
