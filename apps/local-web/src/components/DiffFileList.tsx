import type { ReactElement } from "react";
import type { DiffFileInfo } from "../lib/diff.js";

interface DiffFileListProps {
  files: DiffFileInfo[];
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
  onToggleReviewed: (filePath: string) => void;
  reviewedFiles: Set<string>;
}

const STATUS_ICONS: Record<DiffFileInfo["status"], { icon: string; color: string; label: string }> =
  {
    added: {
      icon: "+",
      color: "text-green-600 bg-green-50 border-green-200",
      label: "Added",
    },
    modified: {
      icon: "~",
      color: "text-blue-600 bg-blue-50 border-blue-200",
      label: "Modified",
    },
    deleted: {
      icon: "-",
      color: "text-red-600 bg-red-50 border-red-200",
      label: "Deleted",
    },
    renamed: {
      icon: "\u2192",
      color: "text-purple-600 bg-purple-50 border-purple-200",
      label: "Renamed",
    },
  };

export function DiffFileList({
  files,
  selectedFile,
  onSelectFile,
  onToggleReviewed,
  reviewedFiles,
}: DiffFileListProps): ReactElement {
  if (files.length === 0) {
    return <p className="text-sm text-gray-400 italic">No files changed.</p>;
  }

  const allReviewed = files.every((f) => reviewedFiles.has(f.filePath));

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      {files.length > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
          <span>
            {reviewedFiles.size}/{files.length} files reviewed
          </span>
          {allReviewed && <span className="text-green-600 font-medium">All files reviewed</span>}
        </div>
      )}
      <div className="max-h-80 overflow-y-auto">
        {files.map((f) => {
          const statusInfo = STATUS_ICONS[f.status];
          const isSelected = selectedFile === f.filePath;
          const isReviewed = reviewedFiles.has(f.filePath);
          return (
            <div
              key={f.filePath}
              className={`flex items-center gap-2 px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors ${
                isSelected
                  ? "bg-blue-50 border-l-2 border-l-blue-500"
                  : "hover:bg-gray-50 border-l-2 border-l-transparent"
              }`}
              onClick={() => {
                onSelectFile(f.filePath);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectFile(f.filePath);
              }}
            >
              <div
                className={`shrink-0 w-16 text-center text-xs font-medium px-1.5 py-0.5 rounded border ${statusInfo.color}`}
              >
                {statusInfo.icon} {statusInfo.label}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-mono text-xs truncate block">{f.filePath}</span>
                <span className="text-xs text-gray-400">
                  +{f.additions}/-{f.deletions}
                </span>
              </div>
              {f.isRisky && (
                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                  Risky
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleReviewed(f.filePath);
                }}
                className={`shrink-0 px-2 py-1 text-xs rounded border transition-colors ${
                  isReviewed
                    ? "bg-green-50 text-green-700 border-green-300"
                    : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                }`}
              >
                {isReviewed ? "Reviewed" : "Skip"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
