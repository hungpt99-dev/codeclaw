import { writeFile } from "node:fs/promises";
import type { ArtifactRecord, RunInfo } from "./utils.js";

interface JsonExportData {
  metadata: {
    runId: string;
    title: string;
    mode: string;
    status: string;
    outputLanguage: string;
    createdAt: string;
    exportedAt: string;
    totalArtifacts: number;
  };
  artifacts: {
    id: string;
    type: string;
    name: string;
    format: string;
    content: string | undefined;
  }[];
}

interface JsonExportOptions {
  outputPath: string;
}

interface JsonExportResult {
  outputPath: string;
  fileSize: number;
  data: JsonExportData;
}

export async function exportJson(
  runInfo: RunInfo,
  artifacts: ArtifactRecord[],
  options: JsonExportOptions,
): Promise<JsonExportResult> {
  const data: JsonExportData = {
    metadata: {
      runId: runInfo.id,
      title: runInfo.title,
      mode: runInfo.mode,
      status: runInfo.status,
      outputLanguage: runInfo.outputLanguage,
      createdAt: runInfo.createdAt,
      exportedAt: new Date().toISOString(),
      totalArtifacts: artifacts.length,
    },
    artifacts: artifacts.map((a) => ({
      id: a.id,
      type: a.type,
      name: a.name,
      format: a.format,
      content: a.content,
    })),
  };

  const json = JSON.stringify(data, null, 2);
  const outputPath = options.outputPath.endsWith(".json")
    ? options.outputPath
    : `${options.outputPath}.json`;

  await writeFile(outputPath, json, "utf-8");

  return {
    outputPath,
    fileSize: Buffer.byteLength(json, "utf-8"),
    data,
  };
}
