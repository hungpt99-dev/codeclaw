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

export async function detectNodeNestJs(root: string): Promise<Partial<RepositoryAnalysis> | null> {
  const hasPackageJson = await fileExists(join(root, "package.json"));
  if (!hasPackageJson) return null;

  let packageJsonContent: string | undefined;
  try {
    packageJsonContent = await readFile(join(root, "package.json"), "utf-8");
  } catch {
    return null;
  }

  const hasNestCliJson = await fileExists(join(root, "nest-cli.json"));
  const hasNestCore = packageJsonContent.includes("@nestjs/core");
  const isNestJs = hasNestCliJson || hasNestCore;

  const sourceDirs: string[] = [];
  const testDirs: string[] = [];
  const configFiles: string[] = [];
  const detectedPatterns: string[] = [];

  if (await dirExists(join(root, "src"))) sourceDirs.push("src");
  if (await dirExists(join(root, "test"))) testDirs.push("test");

  let testFramework: string | null = null;
  let migrationTool: string | null = null;
  let packageManager: string | null = null;

  if (await fileExists(join(root, "pnpm-lock.yaml"))) packageManager = "pnpm";
  else if (await fileExists(join(root, "yarn.lock"))) packageManager = "yarn";
  else if (await fileExists(join(root, "package-lock.json"))) packageManager = "npm";

  if (isNestJs) detectedPatterns.push("module-controller-service");

  if (packageJsonContent.includes("prisma")) {
    migrationTool = "prisma";
    detectedPatterns.push("prisma-orm");
  }
  if (packageJsonContent.includes("typeorm")) {
    migrationTool ??= "typeorm";
    detectedPatterns.push("typeorm-orm");
  }

  if (packageJsonContent.includes("jest")) testFramework = "jest";
  else if (packageJsonContent.includes("vitest")) testFramework = "vitest";
  else if (packageJsonContent.includes("mocha")) testFramework = "mocha";

  if (await fileExists(join(root, "tsconfig.json"))) configFiles.push("tsconfig.json");

  return {
    projectType: isNestJs ? "node-nestjs" : "node-express",
    language: "typescript",
    framework: isNestJs ? "nestjs" : "node",
    buildTool: null,
    testFramework,
    migrationTool,
    sourceDirs,
    testDirs,
    configFiles,
    detectedPatterns,
    packageManager,
    nodeVersion: await detectNodeVersion(root, packageJsonContent),
    javaVersion: null,
  };
}

async function detectNodeVersion(root: string, packageJsonContent: string): Promise<string | null> {
  try {
    const parsed: { engines?: { node?: string } } = JSON.parse(packageJsonContent) as {
      engines?: { node?: string };
    };
    if (parsed.engines?.node) return parsed.engines.node;
  } catch {
    // fall through
  }
  try {
    const nvmrc = await readFile(join(root, ".nvmrc"), "utf-8");
    return nvmrc.trim();
  } catch {
    // fall through
  }
  return null;
}
