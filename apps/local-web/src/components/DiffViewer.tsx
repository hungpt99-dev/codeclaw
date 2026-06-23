import type { ReactElement } from "react";

interface DiffViewerProps {
  diffContent: string;
  fileName?: string;
}

interface DiffLine {
  type: "add" | "remove" | "header" | "context" | "empty";
  content: string;
  oldLine?: number;
  newLine?: number;
}

function parseDiff(diffContent: string): DiffLine[] {
  const lines = diffContent.split("\n");
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (
      line.startsWith("diff --git") ||
      line.startsWith("index ") ||
      line.startsWith("--- ") ||
      line.startsWith("+++ ")
    ) {
      result.push({ type: "header", content: line });
      continue;
    }

    if (line.startsWith("@@")) {
      const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (match) {
        oldLine = Number(match[1]) - 1;
        newLine = Number(match[2]) - 1;
      }
      result.push({ type: "header", content: line });
      continue;
    }

    if (line === "") {
      result.push({ type: "empty", content: "" });
      continue;
    }

    if (line.startsWith("+")) {
      newLine++;
      result.push({ type: "add", content: line, newLine });
    } else if (line.startsWith("-")) {
      oldLine++;
      result.push({ type: "remove", content: line, oldLine });
    } else if (line.startsWith(" ")) {
      oldLine++;
      newLine++;
      result.push({ type: "context", content: line, oldLine, newLine });
    } else {
      result.push({ type: "context", content: line });
    }
  }

  return result;
}

const LINE_STYLES: Record<DiffLine["type"], string> = {
  add: "bg-green-50 text-green-800 border-l-2 border-green-500",
  remove: "bg-red-50 text-red-800 border-l-2 border-red-500",
  header: "text-gray-500 bg-gray-100 font-mono text-xs",
  context: "text-gray-700",
  empty: "",
};

export function DiffViewer({ diffContent, fileName }: DiffViewerProps): ReactElement {
  const lines = parseDiff(diffContent);

  if (!diffContent || diffContent.trim() === "") {
    return (
      <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-400 italic">
        No diff content available.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-200 overflow-hidden">
      {fileName && (
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
          {fileName}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full font-mono text-xs leading-5">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className={LINE_STYLES[line.type]}>
                <td className="w-12 text-right pr-2 text-gray-400 select-none">
                  {line.oldLine !== undefined ? String(line.oldLine) : ""}
                </td>
                <td className="w-12 text-right pr-2 text-gray-400 select-none">
                  {line.newLine !== undefined ? String(line.newLine) : ""}
                </td>
                <td className="px-1 whitespace-pre">{line.content || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
