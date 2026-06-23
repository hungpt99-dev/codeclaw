import Markdown from "react-markdown";
import type { ReactElement } from "react";

export function MarkdownViewer({ content }: { content: string }): ReactElement {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-code:before:content-none prose-code:after:content-none">
      <Markdown>{content}</Markdown>
    </div>
  );
}
