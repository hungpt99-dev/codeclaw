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

export async function detectJavaSpringBoot(
  root: string,
): Promise<Partial<RepositoryAnalysis> | null> {
  const hasPom = await fileExists(join(root, "pom.xml"));
  const hasGradle = await fileExists(join(root, "build.gradle"));

  if (!hasPom && !hasGradle) return null;

  const sourceDirs: string[] = [];
  const testDirs: string[] = [];
  const configFiles: string[] = [];
  const detectedPatterns: string[] = [];

  const javaMain = join(root, "src", "main", "java");
  const javaTest = join(root, "src", "test", "java");

  if (await dirExists(javaMain)) sourceDirs.push("src/main/java");
  if (await dirExists(join(root, "src", "main", "resources"))) {
    sourceDirs.push("src/main/resources");
  }
  if (await dirExists(javaTest)) testDirs.push("src/test/java");

  const buildTool = hasPom ? "maven" : "gradle";

  let javaVersion: string | null = null;
  let testFramework: string | null = null;
  let migrationTool: string | null = null;
  const isSpringBoot = hasPom
    ? await detectSpringBootInPom(root)
    : await detectSpringBootInGradle(root);

  if (hasPom) {
    const pomContent = await readFile(join(root, "pom.xml"), "utf-8");

    const javaVersionMatch = /<java\.version>([^<]+)<\/java\.version>/.exec(pomContent);
    if (javaVersionMatch?.[1]) javaVersion = javaVersionMatch[1];

    const junitRe = /junit[-_]?jupiter/;
    const mockitoRe = /mockito/;
    const testngRe = /testng/;

    if (testngRe.exec(pomContent)) testFramework = "testng";
    else if (junitRe.exec(pomContent) || pomContent.includes("junit")) testFramework = "junit";
    if (mockitoRe.exec(pomContent)) detectedPatterns.push("mockito");

    const flywayRe = /flyway/;
    const liquibaseRe = /liquibase/;
    if (flywayRe.exec(pomContent)) {
      migrationTool = "flyway";
      detectedPatterns.push("flyway-migrations");
    }
    if (liquibaseRe.exec(pomContent)) {
      migrationTool = "liquibase";
      detectedPatterns.push("liquibase-migrations");
    }
  }

  if (hasGradle) {
    const gradleContent = await readFile(join(root, "build.gradle"), "utf-8");
    if (gradleContent.includes("junit")) testFramework = "junit";
    if (gradleContent.includes("mockito")) detectedPatterns.push("mockito");
    if (gradleContent.includes("flyway")) {
      migrationTool = "flyway";
      detectedPatterns.push("flyway-migrations");
    }
    if (gradleContent.includes("liquibase")) {
      migrationTool = "liquibase";
      detectedPatterns.push("liquibase-migrations");
    }
  }

  if (await fileExists(join(root, "src", "main", "resources", "application.yml"))) {
    configFiles.push("src/main/resources/application.yml");
  }
  if (await fileExists(join(root, "src", "main", "resources", "application.properties"))) {
    configFiles.push("src/main/resources/application.properties");
  }

  if (await dirExists(join(root, "src", "main", "resources", "db", "migration"))) {
    detectedPatterns.push("db-migration-resources");
  }

  if (isSpringBoot && sourceDirs.some((d) => d.includes("java"))) {
    detectedPatterns.push("controller-service-repository");
    detectedPatterns.push("dto-based-api");
  }

  if (isSpringBoot) {
    return {
      projectType: "java-spring-boot",
      language: "java",
      framework: "spring-boot",
      buildTool,
      testFramework,
      migrationTool,
      sourceDirs,
      testDirs,
      configFiles,
      detectedPatterns,
      packageManager: null,
      nodeVersion: null,
      javaVersion: javaVersion ?? "17",
    };
  }

  return {
    projectType: "java-spring-boot",
    language: "java",
    framework: "java",
    buildTool,
    testFramework,
    migrationTool,
    sourceDirs,
    testDirs,
    configFiles,
    detectedPatterns,
    packageManager: null,
    nodeVersion: null,
    javaVersion,
  };
}

async function detectSpringBootInPom(root: string): Promise<boolean> {
  try {
    const content = await readFile(join(root, "pom.xml"), "utf-8");
    return (
      content.includes("spring-boot-starter") ||
      (content.includes("<parent>") && content.includes("spring-boot"))
    );
  } catch {
    return false;
  }
}

async function detectSpringBootInGradle(root: string): Promise<boolean> {
  try {
    const content = await readFile(join(root, "build.gradle"), "utf-8");
    return content.includes("spring-boot") || content.includes("org.springframework.boot");
  } catch {
    return false;
  }
}
