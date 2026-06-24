import { access, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { RepositoryAnalysis } from "@codeclaw/shared";

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function detectGeneric(root: string): Promise<Partial<RepositoryAnalysis> | null> {
  const sourceDirs: string[] = [];
  const testDirs: string[] = [];
  const configFiles: string[] = [];
  const detectedPatterns: string[] = [];

  const commonSrcDirs = ["src", "lib", "app", "source"];
  for (const dir of commonSrcDirs) {
    if (await pathExists(join(root, dir))) sourceDirs.push(dir);
  }

  const commonTestDirs = ["test", "tests", "__tests__", "spec", "e2e"];
  for (const dir of commonTestDirs) {
    if (await pathExists(join(root, dir))) testDirs.push(dir);
  }

  let language: string | null = null;
  const commonConfigFiles = [
    ".gitignore",
    "README.md",
    "Dockerfile",
    "Makefile",
    ".env.example",
    "docker-compose.yml",
    ".editorconfig",
  ];

  for (const file of commonConfigFiles) {
    if (await pathExists(join(root, file))) configFiles.push(file);
  }

  if (await pathExists(join(root, "requirements.txt"))) {
    language = "python";
    detectedPatterns.push("python-project");
  }
  if (await pathExists(join(root, "Cargo.toml"))) {
    language = "rust";
    detectedPatterns.push("rust-project");
  }
  if (await pathExists(join(root, "go.mod"))) {
    language = "go";
    detectedPatterns.push("go-project");
  }
  if (await pathExists(join(root, "Gemfile"))) {
    language = "ruby";
    detectedPatterns.push("ruby-project");
  }
  if (await pathExists(join(root, "composer.json"))) {
    language = "php";
    detectedPatterns.push("php-project");
  }

  if (language === null) {
    try {
      const files = await readdir(root);
      const extensions = new Set(files.map((f) => f.split(".").pop()));
      if (extensions.has("py")) {
        language = "python";
      } else if (extensions.has("rs")) {
        language = "rust";
      } else if (extensions.has("go")) {
        language = "go";
      } else if (extensions.has("rb")) {
        language = "ruby";
      } else if (extensions.has("php")) {
        language = "php";
      } else if (extensions.has("ts") || extensions.has("tsx")) {
        language = "typescript";
      } else if (extensions.has("js") || extensions.has("jsx")) {
        language = "javascript";
      } else if (extensions.has("java")) {
        language = "java";
      } else if (extensions.has("kt") || extensions.has("kts")) {
        language = "kotlin";
      } else if (extensions.has("swift")) {
        language = "swift";
      }
    } catch {
      // ignore
    }
  }

  return {
    projectType: "generic",
    language,
    framework: null,
    buildTool: null,
    testFramework: null,
    migrationTool: null,
    sourceDirs,
    testDirs,
    configFiles,
    detectedPatterns,
    packageManager: null,
    nodeVersion: null,
    javaVersion: null,
  };
}
