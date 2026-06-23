import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RepositoryAnalysis } from "@aiteam/shared";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function dirExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function detectReactVite(root: string): Promise<Partial<RepositoryAnalysis> | null> {
  const hasViteConfig = await fileExists(join(root, "vite.config.ts"));
  if (!hasViteConfig) return null;

  const hasPackageJson = await fileExists(join(root, "package.json"));
  if (!hasPackageJson) return null;

  let packageJsonContent: string | undefined;
  try {
    packageJsonContent = await readFile(join(root, "package.json"), "utf-8");
  } catch {
    return null;
  }

  const sourceDirs: string[] = [];
  const testDirs: string[] = [];
  const configFiles: string[] = [];
  const detectedPatterns: string[] = [];

  if (await dirExists(join(root, "src"))) sourceDirs.push("src");
  if (await dirExists(join(root, "test"))) testDirs.push("test");
  if (await dirExists(join(root, "__tests__"))) testDirs.push("__tests__");
  if (await dirExists(join(root, "e2e"))) testDirs.push("e2e");

  let testFramework: string | null = null;
  let packageManager: string | null = null;

  if (await fileExists(join(root, "pnpm-lock.yaml"))) packageManager = "pnpm";
  else if (await fileExists(join(root, "yarn.lock"))) packageManager = "yarn";
  else if (await fileExists(join(root, "package-lock.json"))) packageManager = "npm";

  const hasReact = packageJsonContent.includes("react");
  const hasNextJs = packageJsonContent.includes("next");
  const hasTailwind =
    packageJsonContent.includes("tailwindcss") ||
    (await fileExists(join(root, "tailwind.config.ts"))) ||
    (await fileExists(join(root, "tailwind.config.js")));

  if (hasNextJs) {
    detectedPatterns.push("app-router");
  }

  if (packageJsonContent.includes("vitest")) testFramework = "vitest";
  else if (packageJsonContent.includes("jest")) testFramework = "jest";
  else if (packageJsonContent.includes("playwright")) testFramework = "playwright";

  if (await fileExists(join(root, "tsconfig.json"))) configFiles.push("tsconfig.json");
  configFiles.push("vite.config.ts");

  if (hasTailwind) detectedPatterns.push("tailwind-css");

  return {
    projectType: hasNextJs ? "react-vite" : "react-vite",
    language: "typescript",
    framework: hasNextJs ? "nextjs" : hasReact ? "react" : "vite",
    buildTool: "vite",
    testFramework,
    migrationTool: null,
    sourceDirs,
    testDirs,
    configFiles,
    detectedPatterns,
    packageManager,
    nodeVersion: null,
    javaVersion: null,
  };
}
