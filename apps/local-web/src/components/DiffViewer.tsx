import { useState, useMemo, type ReactElement } from "react";
import { parseDiffContent, computeStats } from "../lib/diff.js";
import { DiffStats } from "./DiffStats.js";
import { DiffFileList } from "./DiffFileList.js";
import { DiffFileView } from "./DiffFileView.js";

interface DiffViewerProps {
  diffContent: string;
  fileName?: string;
  warnFiles?: string[] | undefined;
  renderMode?: "auto" | "simple" | "full";
}

export function DiffViewer({
  diffContent,
  fileName,
  warnFiles,
  renderMode = "auto",
}: DiffViewerProps): ReactElement {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<"line-by-line" | "side-by-side">("line-by-line");
  const [reviewedFiles, setReviewedFiles] = useState<Set<string>>(new Set());

  const files = useMemo(() => {
    if (!diffContent) return [];
    return parseDiffContent(diffContent, warnFiles);
  }, [diffContent, warnFiles]);

  const stats = useMemo(() => computeStats(files), [files]);

  const effectiveMode =
    renderMode === "auto"
      ? files.length > 1 || (files.length === 1 && fileName === undefined)
        ? "full"
        : "simple"
      : renderMode;

  const handleToggleReviewed = (filePath: string): void => {
    setReviewedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  if (!diffContent || diffContent.trim() === "") {
    return (
      <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-400 italic">
        No diff content available.
      </div>
    );
  }

  if (effectiveMode === "simple") {
    const displayName = fileName ?? files[0]?.filePath;
    return (
      <div className="rounded-md border border-gray-200 overflow-hidden">
        {displayName && (
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            {displayName}
          </div>
        )}
        <div className="overflow-x-auto">
          <DiffFileView
            diffContent={diffContent}
            selectedFile={files[0]?.filePath ?? null}
            outputFormat={outputFormat}
          />
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-400 italic">
        No parseable diff content available.
      </div>
    );
  }

  const currentFile = selectedFile ?? files[0]?.filePath ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <DiffStats stats={stats} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setReviewedFiles(new Set(files.map((f) => f.filePath)));
            }}
            className="text-xs px-2 py-1 rounded border bg-white text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Mark All Reviewed
          </button>
          <div className="flex items-center gap-1 text-xs border border-gray-200 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setOutputFormat("line-by-line");
              }}
              className={`px-2 py-1 transition-colors ${
                outputFormat === "line-by-line"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Unified
            </button>
            <button
              type="button"
              onClick={() => {
                setOutputFormat("side-by-side");
              }}
              className={`px-2 py-1 transition-colors ${
                outputFormat === "side-by-side"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Side-by-side
            </button>
          </div>
        </div>
      </div>

      <DiffFileList
        files={files}
        selectedFile={currentFile}
        onSelectFile={setSelectedFile}
        onToggleReviewed={handleToggleReviewed}
        reviewedFiles={reviewedFiles}
      />

      <DiffFileView
        diffContent={diffContent}
        selectedFile={currentFile}
        outputFormat={outputFormat}
      />
    </div>
  );
}
