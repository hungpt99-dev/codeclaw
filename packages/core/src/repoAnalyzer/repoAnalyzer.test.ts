import { describe, it, expect } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { analyzeRepository, analysisToMarkdown } from "./repoAnalyzer.js";

const TEST_DIR = join(".ai-team", "__test_repo_analyzer__");

async function createMockProject(files: Record<string, string>, dirs: string[]): Promise<string> {
  await rm(TEST_DIR, { recursive: true, force: true }).catch(() => undefined);
  for (const dir of dirs) {
    await mkdir(join(TEST_DIR, dir), { recursive: true });
  }
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = join(TEST_DIR, filePath);
    await mkdir(fullPath.split("/").slice(0, -1).join("/"), {
      recursive: true,
    }).catch(() => undefined);
    await writeFile(fullPath, content, "utf-8");
  }
  return TEST_DIR;
}

describe("analyzeRepository", () => {
  it("detects Java / Spring Boot with Maven", async () => {
    const root = await createMockProject(
      {
        "pom.xml": `<project><parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId></parent><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency><dependency><groupId>org.junit.jupiter</groupId><artifactId>junit-jupiter</artifactId></dependency><dependency><groupId>org.mockito</groupId><artifactId>mockito-core</artifactId></dependency><dependency><groupId>org.flywaydb</groupId><artifactId>flyway-core</artifactId></dependency></dependencies></project>`,
      },
      ["src/main/java/com/example", "src/test/java/com/example", "src/main/resources/db/migration"],
    );

    const result = await analyzeRepository(root);
    expect(result.projectType).toBe("java-spring-boot");
    expect(result.language).toBe("java");
    expect(result.framework).toBe("spring-boot");
    expect(result.buildTool).toBe("maven");
    expect(result.testFramework).toBe("junit");
    expect(result.migrationTool).toBe("flyway");
    expect(result.sourceDirs).toContain("src/main/java");
    expect(result.testDirs).toContain("src/test/java");
    expect(result.detectedPatterns).toContain("mockito");
    expect(result.detectedPatterns).toContain("controller-service-repository");
    expect(result.detectedPatterns).toContain("flyway-migrations");

    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("detects Node / NestJS", async () => {
    const root = await createMockProject(
      {
        "package.json": JSON.stringify({
          name: "test-app",
          dependencies: { "@nestjs/core": "^10.0.0" },
          devDependencies: { jest: "^29.0.0" },
        }),
        "nest-cli.json": "{}",
        "tsconfig.json": "{}",
      },
      ["src", "test"],
    );

    const result = await analyzeRepository(root);
    expect(result.projectType).toBe("node-nestjs");
    expect(result.language).toBe("typescript");
    expect(result.framework).toBe("nestjs");
    expect(result.testFramework).toBe("jest");
    expect(result.sourceDirs).toContain("src");
    expect(result.testDirs).toContain("test");

    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("detects React / Vite", async () => {
    const root = await createMockProject(
      {
        "vite.config.ts": 'import { defineConfig } from "vite";',
        "package.json": JSON.stringify({
          name: "test-app",
          dependencies: { react: "^18.0.0" },
          devDependencies: { vitest: "^1.0.0", tailwindcss: "^3.0.0" },
        }),
        "tsconfig.json": "{}",
        "tailwind.config.ts": "export default {};",
      },
      ["src", "test"],
    );

    const result = await analyzeRepository(root);
    expect(result.projectType).toBe("react-vite");
    expect(result.language).toBe("typescript");
    expect(result.framework).toBe("react");
    expect(result.buildTool).toBe("vite");
    expect(result.testFramework).toBe("vitest");
    expect(result.sourceDirs).toContain("src");
    expect(result.detectedPatterns).toContain("tailwind-css");

    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("returns generic for empty directory", async () => {
    const root = await createMockProject({}, []);

    const result = await analyzeRepository(root);
    expect(result.projectType).toBe("generic");
    expect(result.language).toBeNull();

    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("analysisToMarkdown produces markdown output", () => {
    const analysis = {
      projectType: "java-spring-boot" as const,
      language: "java",
      framework: "spring-boot",
      buildTool: "maven",
      testFramework: "junit",
      migrationTool: null,
      sourceDirs: ["src/main/java", "src/main/resources"],
      testDirs: ["src/test/java"],
      configFiles: ["pom.xml"],
      detectedPatterns: ["controller-service-repository"],
      packageManager: null,
      nodeVersion: null,
      javaVersion: "17",
    };

    const md = analysisToMarkdown(analysis);
    expect(md).toContain("Repository Analysis");
    expect(md).toContain("java-spring-boot");
    expect(md).toContain("spring-boot");
    expect(md).toContain("maven");
    expect(md).toContain("src/main/java");
    expect(md).toContain("src/test/java");
    expect(md).toContain("controller-service-repository");
  });
});
