import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ZipBuilder } from "./zipBuilder.js";
import { buildDeliveryPackageMarkdown } from "./combinedMdBuilder.js";
import { exportJson } from "./jsonExporter.js";
import { collectArtifactContents, type ArtifactRecord, type RunInfo } from "./utils.js";
import { convertMdToHtml } from "./mdToHtml.js";

export type DeliveryPackageFormat = "zip" | "combined-md" | "json" | "all";

export interface DeliveryPackageOptions {
  format: DeliveryPackageFormat;
  outputPath: string;
  docTitle?: string | undefined;
  docAuthor?: string | undefined;
}

export interface DeliveryPackageResult {
  success: boolean;
  results: {
    format: string;
    outputPath: string;
    fileSize: number;
  }[];
  error?: string;
}

async function writeResult(
  artifactDir: string,
  filename: string,
  content: string | Buffer,
): Promise<{ outputPath: string; fileSize: number }> {
  const outputPath = join(artifactDir, filename);
  const outDir = dirname(outputPath);
  await mkdir(outDir, { recursive: true });
  await writeFile(outputPath, content);
  return {
    outputPath,
    fileSize: typeof content === "string" ? Buffer.byteLength(content, "utf-8") : content.length,
  };
}

export async function buildDeliveryPackage(
  runId: string,
  runInfo: RunInfo,
  artifacts: ArtifactRecord[],
  options: DeliveryPackageOptions,
): Promise<DeliveryPackageResult> {
  const outputDir = options.outputPath;
  await mkdir(outputDir, { recursive: true });

  const artifactsWithContent = await collectArtifactContents(artifacts);
  const title = options.docTitle ?? `Run ${runId}`;
  const results: DeliveryPackageResult["results"] = [];

  try {
    if (options.format === "zip" || options.format === "all") {
      const zipBuilder = new ZipBuilder();
      try {
        const zipResult = await zipBuilder.build(runInfo, artifactsWithContent, {
          outputPath: join(outputDir, "delivery-package"),
        });
        results.push({ format: "zip", ...zipResult });
      } finally {
        await zipBuilder.cleanup();
      }
    }

    if (options.format === "combined-md" || options.format === "all") {
      const combinedMd = buildDeliveryPackageMarkdown(runInfo, artifactsWithContent, { title });
      const mdResult = await writeResult(outputDir, "combined-report.md", combinedMd);
      results.push({ format: "combined-md", ...mdResult });
    }

    if (options.format === "json" || options.format === "all") {
      const jsonResult = await exportJson(runInfo, artifactsWithContent, {
        outputPath: join(outputDir, "delivery-package"),
      });
      results.push({
        format: "json",
        outputPath: jsonResult.outputPath,
        fileSize: jsonResult.fileSize,
      });
    }

    if (options.format === "all") {
      const combinedMd = buildDeliveryPackageMarkdown(runInfo, artifactsWithContent, { title });
      const htmlResult = await writeResult(
        outputDir,
        "report.html",
        await convertMdToHtml(combinedMd, {
          title,
          includeTableOfContents: true,
          includeHeader: true,
          includeFooter: true,
        }),
      );
      results.push({ format: "html", ...htmlResult });
    }

    return { success: true, results };
  } catch (error) {
    return {
      success: false,
      results,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
