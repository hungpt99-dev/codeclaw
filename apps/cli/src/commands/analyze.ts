import { access, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { analyzeRepository, analysisToMarkdown } from "@codeclaw/core";

interface AnalyzeOptions {
  run?: string;
  json?: boolean;
  include?: string;
  exclude?: string;
}

async function dirExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function analyzeCommand(options: AnalyzeOptions): Promise<void> {
  const projectRoot = process.cwd();

  if (options.run) {
    const runDir = join(".codeclaw", "runs", options.run);
    if (!(await dirExists(runDir))) {
      console.error(`❌ Run not found: ${options.run}`);
      process.exit(1);
    }

    const analysis = await analyzeRepository(projectRoot);
    const designDir = join(runDir, "design");
    await mkdir(designDir, { recursive: true });

    const mdContent = analysisToMarkdown(analysis);
    const analysisPath = join(designDir, "repository-analysis.md");
    await writeFile(analysisPath, mdContent, "utf-8");
    console.log(`✅ Repository analysis saved to ${analysisPath}`);
  }

  const analysis = await analyzeRepository(projectRoot);

  if (options.json) {
    console.log(JSON.stringify(analysis, null, 2));
    return;
  }

  console.log("\n🔍 Repository Analysis\n");
  console.log(`  Project Type:     ${analysis.projectType ?? "Unknown"}`);
  console.log(`  Language:         ${analysis.language ?? "Unknown"}`);
  console.log(`  Framework:        ${analysis.framework ?? "Unknown"}`);
  console.log(`  Build Tool:       ${analysis.buildTool ?? "Unknown"}`);
  console.log(`  Test Framework:   ${analysis.testFramework ?? "Unknown"}`);
  console.log(`  Migration Tool:   ${analysis.migrationTool ?? "Not detected"}`);
  console.log(`  Package Manager:  ${analysis.packageManager ?? "Not detected"}`);
  console.log(`  Node Version:     ${analysis.nodeVersion ?? "Not detected"}`);
  console.log(`  Java Version:     ${analysis.javaVersion ?? "Not detected"}`);
  console.log("");
  console.log(`  Source Dirs:      ${analysis.sourceDirs.join(", ") || "None"}`);
  console.log(`  Test Dirs:        ${analysis.testDirs.join(", ") || "None"}`);
  console.log(`  Config Files:     ${analysis.configFiles.join(", ") || "None"}`);
  console.log(`  Patterns:         ${analysis.detectedPatterns.join(", ") || "None"}`);
  console.log("");
}
