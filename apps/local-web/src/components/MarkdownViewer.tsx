import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactElement } from "react";

export function MarkdownViewer({ content }: { content: string }): ReactElement {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-code:before:content-none prose-code:after:content-none prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-table:text-sm prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border prose-th:border">
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  );
}
