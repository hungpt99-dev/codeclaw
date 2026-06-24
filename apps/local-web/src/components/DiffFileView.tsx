import { useMemo, type ReactElement } from "react";
import { renderFileDiffHtml } from "../lib/diff.js";
import "diff2html/bundles/css/diff2html.min.css";

interface DiffFileViewProps {
  diffContent: string;
  selectedFile: string | null;
  outputFormat: "line-by-line" | "side-by-side";
}

export function DiffFileView({
  diffContent,
  selectedFile,
  outputFormat,
}: DiffFileViewProps): ReactElement {
  const htmlContent = useMemo(() => {
    if (!diffContent || !selectedFile) return "";
    return renderFileDiffHtml(diffContent, selectedFile, outputFormat);
  }, [diffContent, selectedFile, outputFormat]);

  if (!selectedFile) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400 italic">
        Select a file to view its diff
      </div>
    );
  }

  if (!htmlContent) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400 italic">
        No diff content available for this file.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <div
        className="diff-view-wrapper text-xs"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
