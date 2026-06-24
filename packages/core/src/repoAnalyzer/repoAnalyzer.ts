import type { RepositoryAnalysis } from "@codeclaw/shared";
import { detectJavaSpringBoot } from "./detectors/javaDetector.js";
import { detectNodeNestJs } from "./detectors/nodeDetector.js";
import { detectReactVite } from "./detectors/reactDetector.js";
import { detectGeneric } from "./detectors/genericDetector.js";

export async function analyzeRepository(projectRoot: string): Promise<RepositoryAnalysis> {
  const results = await Promise.all([
    detectJavaSpringBoot(projectRoot),
    detectReactVite(projectRoot),
    detectNodeNestJs(projectRoot),
    detectGeneric(projectRoot),
  ]);

  const preferJava = results[0];
  const preferReact = results[1];
  const preferNode = results[2];
  const fallback = results[3];

  const specificDetection = preferJava ?? preferReact ?? preferNode;

  if (specificDetection) {
    return mergeAnalysis(specificDetection, fallback ?? {});
  }

  return mergeAnalysis(fallback ?? {}, {});
}

function mergeAnalysis(
  specific: Partial<RepositoryAnalysis>,
  generic: Partial<RepositoryAnalysis>,
): RepositoryAnalysis {
  return {
    projectType: specific.projectType ?? generic.projectType ?? "generic",
    language: specific.language ?? generic.language ?? null,
    framework: specific.framework ?? generic.framework ?? null,
    buildTool: specific.buildTool ?? generic.buildTool ?? null,
    testFramework: specific.testFramework ?? generic.testFramework ?? null,
    migrationTool: specific.migrationTool ?? generic.migrationTool ?? null,
    sourceDirs: [...new Set([...(generic.sourceDirs ?? []), ...(specific.sourceDirs ?? [])])],
    testDirs: [...new Set([...(generic.testDirs ?? []), ...(specific.testDirs ?? [])])],
    configFiles: [...new Set([...(generic.configFiles ?? []), ...(specific.configFiles ?? [])])],
    detectedPatterns: [
      ...new Set([...(generic.detectedPatterns ?? []), ...(specific.detectedPatterns ?? [])]),
    ],
    packageManager: specific.packageManager ?? generic.packageManager ?? null,
    nodeVersion: specific.nodeVersion ?? generic.nodeVersion ?? null,
    javaVersion: specific.javaVersion ?? generic.javaVersion ?? null,
  };
}

export function analysisToMarkdown(analysis: RepositoryAnalysis): string {
  const lines: string[] = [
    "# Repository Analysis",
    "",
    "## Overview",
    `- **Project Type**: ${analysis.projectType ?? "Unknown"}`,
    `- **Language**: ${analysis.language ?? "Unknown"}`,
    `- **Framework**: ${analysis.framework ?? "Unknown"}`,
    `- **Build Tool**: ${analysis.buildTool ?? "Unknown"}`,
    `- **Test Framework**: ${analysis.testFramework ?? "Unknown"}`,
    `- **Migration Tool**: ${analysis.migrationTool ?? "Not detected"}`,
    `- **Package Manager**: ${analysis.packageManager ?? "Not detected"}`,
    `- **Node Version**: ${analysis.nodeVersion ?? "Not detected"}`,
    `- **Java Version**: ${analysis.javaVersion ?? "Not detected"}`,
    "",
    "## Source Directories",
    analysis.sourceDirs.length > 0
      ? analysis.sourceDirs.map((d) => `- ${d}`).join("\n")
      : "- None detected",
    "",
    "## Test Directories",
    analysis.testDirs.length > 0
      ? analysis.testDirs.map((d) => `- ${d}`).join("\n")
      : "- None detected",
    "",
    "## Config Files",
    analysis.configFiles.length > 0
      ? analysis.configFiles.map((f) => `- ${f}`).join("\n")
      : "- None detected",
    "",
    "## Detected Patterns",
    analysis.detectedPatterns.length > 0
      ? analysis.detectedPatterns.map((p) => `- ${p}`).join("\n")
      : "- None detected",
    "",
  ];
  return lines.join("\n");
}
