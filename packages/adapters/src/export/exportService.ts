import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { convertMdToHtml, type HtmlDocumentOptions } from "./mdToHtml.js";
import { convertHtmlToDocx, type DocxOptions } from "./htmlToDocx.js";
import { convertHtmlToPdf, type PdfOptions } from "./htmlToPdf.js";
import {
  collectArtifactContents,
  buildCombinedMarkdown,
  type ArtifactRecord,
  type RunInfo,
} from "./utils.js";
import { buildDeliveryPackage } from "./deliveryPackage.js";

export type ExportFormat =
  | "markdown"
  | "html"
  | "docx"
  | "pdf"
  | "zip"
  | "combined-md"
  | "json"
  | "all";

export interface ExportOptions {
  format: ExportFormat;
  outputPath: string;
  includeLogs?: boolean;
  includeDiff?: boolean;
  docTitle?: string;
  docAuthor?: string;
}

export interface ExportResult {
  success: boolean;
  outputPath: string;
  format: string;
  fileSize: number;
  error?: string | undefined;
}

function getRunDir(runId: string): string {
  return join(process.cwd(), ".ai-team", "runs", runId);
}

export async function exportRunArtifacts(
  runId: string,
  artifacts: ArtifactRecord[],
  options: ExportOptions,
): Promise<ExportResult> {
  const runDir = getRunDir(runId);

  try {
    const outputDir = dirname(options.outputPath);
    await mkdir(outputDir, { recursive: true });

    const artifactsWithContent = await collectArtifactContents(artifacts);

    if (options.format === "markdown") {
      return await exportMarkdown(runId, runDir, artifactsWithContent, options);
    }

    if (options.format === "zip") {
      return await exportZip(runId, runDir, options);
    }

    if (options.format === "combined-md" || options.format === "json" || options.format === "all") {
      const runInfo: RunInfo = {
        id: runId,
        title: options.docTitle ?? `Run ${runId}`,
        rawRequirement: "",
        mode: "",
        outputLanguage: "",
        status: "",
        createdAt: "",
      };
      const result = await buildDeliveryPackage(runId, runInfo, artifacts, {
        format: options.format,
        outputPath: outputDir,
        docTitle: options.docTitle,
        docAuthor: options.docAuthor,
      });
      const totalSize = result.results.reduce((sum, r) => sum + r.fileSize, 0);
      const outputPaths = result.results.map((r) => r.outputPath).join(", ");
      return {
        success: result.success,
        outputPath: outputPaths,
        format: options.format,
        fileSize: totalSize,
        error: result.error,
      };
    }

    const title = options.docTitle ?? `Run ${runId}`;
    const combinedMd = buildCombinedMarkdown(artifactsWithContent, title);

    if (options.format === "html") {
      return await exportHtml(combinedMd, title, options);
    }

    if (options.format === "docx") {
      return await exportDocx(combinedMd, title, options);
    }

    return await exportPdf(combinedMd, title, options);
  } catch (error) {
    return {
      success: false,
      outputPath: options.outputPath,
      format: options.format,
      fileSize: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function exportMarkdown(
  runId: string,
  runDir: string,
  artifacts: ArtifactRecord[],
  options: ExportOptions,
): Promise<ExportResult> {
  const outputDir = options.outputPath;
  await mkdir(outputDir, { recursive: true });

  let totalSize = 0;
  for (const artifact of artifacts) {
    if (!artifact.content) continue;
    const outputFile = join(outputDir, artifact.name);
    const outDir = dirname(outputFile);
    await mkdir(outDir, { recursive: true });
    await writeFile(outputFile, artifact.content, "utf-8");
    totalSize += Buffer.byteLength(artifact.content, "utf-8");
  }

  const readmePath = join(outputDir, "README.md");
  await writeFile(
    readmePath,
    `# Run ${runId}\n\nExported on ${new Date().toISOString()}\n`,
    "utf-8",
  );

  return {
    success: true,
    outputPath: outputDir,
    format: "markdown",
    fileSize: totalSize,
  };
}

async function exportZip(
  runId: string,
  runDir: string,
  options: ExportOptions,
): Promise<ExportResult> {
  const outputPath = options.outputPath.endsWith(".zip")
    ? options.outputPath
    : `${options.outputPath}.zip`;

  try {
    const { execa } = await import("execa");
    await execa("zip", ["-r", outputPath, "."], { cwd: runDir });
    const { stat } = await import("node:fs/promises");
    const stats = await stat(outputPath);
    return {
      success: true,
      outputPath,
      format: "zip",
      fileSize: stats.size,
    };
  } catch (error) {
    throw new Error(
      `ZIP export failed: ${error instanceof Error ? error.message : String(error)}\n` +
        "Ensure the 'zip' command is available on your system.\n" +
        "Or try: aiteam export --format markdown",
    );
  }
}

async function exportHtml(
  combinedMd: string,
  title: string,
  options: ExportOptions,
): Promise<ExportResult> {
  const htmlOptions: HtmlDocumentOptions = {
    title,
    includeTableOfContents: true,
    includeHeader: true,
    includeFooter: true,
  };

  const html = await convertMdToHtml(combinedMd, htmlOptions);
  const outputPath = options.outputPath.endsWith(".html")
    ? options.outputPath
    : `${options.outputPath}.html`;

  await writeFile(outputPath, html, "utf-8");
  const size = Buffer.byteLength(html, "utf-8");

  return {
    success: true,
    outputPath,
    format: "html",
    fileSize: size,
  };
}

async function exportDocx(
  combinedMd: string,
  title: string,
  options: ExportOptions,
): Promise<ExportResult> {
  const htmlOptions: HtmlDocumentOptions = {
    title,
    includeTableOfContents: true,
    includeHeader: true,
    includeFooter: true,
  };

  const html = await convertMdToHtml(combinedMd, htmlOptions);
  const docxOptions: DocxOptions = {
    title,
    author: options.docAuthor ?? "AITeam",
  };

  const buffer = await convertHtmlToDocx(html, docxOptions);
  const outputPath = options.outputPath.endsWith(".docx")
    ? options.outputPath
    : `${options.outputPath}.docx`;

  await writeFile(outputPath, buffer);

  return {
    success: true,
    outputPath,
    format: "docx",
    fileSize: buffer.length,
  };
}

async function exportPdf(
  combinedMd: string,
  title: string,
  options: ExportOptions,
): Promise<ExportResult> {
  const htmlOptions: HtmlDocumentOptions = {
    title,
    includeTableOfContents: true,
    includeHeader: true,
    includeFooter: true,
  };

  const html = await convertMdToHtml(combinedMd, htmlOptions);
  const pdfOptions: PdfOptions = {
    title,
    pageSize: "A4",
  };

  const buffer = await convertHtmlToPdf(html, pdfOptions);
  const outputPath = options.outputPath.endsWith(".pdf")
    ? options.outputPath
    : `${options.outputPath}.pdf`;

  await writeFile(outputPath, buffer);

  return {
    success: true,
    outputPath,
    format: "pdf",
    fileSize: buffer.length,
  };
}
