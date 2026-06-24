export interface DocxOptions {
  title: string;
  author?: string;
  company?: string;
}

export async function convertHtmlToDocx(
  htmlContent: string,
  options: DocxOptions,
): Promise<Buffer> {
  let htmlToDocx: (htmlContent: string, docxOptions?: Record<string, unknown>) => Promise<Buffer>;

  try {
    // @ts-expect-error - html-to-docx has no types, we cast manually
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const mod: { default?: unknown } = await import("html-to-docx");
    htmlToDocx = (mod.default ?? mod) as (
      htmlContent: string,
      docxOptions?: Record<string, unknown>,
    ) => Promise<Buffer>;
  } catch {
    throw new Error(
      "DOCX conversion requires the 'html-to-docx' package.\n" +
        "Install it: pnpm add html-to-docx\n" +
        "Or try: codeclaw export --format html",
    );
  }

  const docxOptions: Record<string, unknown> = {
    title: options.title,
    author: options.author ?? "CodeClaw",
    company: options.company ?? "",
  };

  try {
    const buffer = await htmlToDocx(htmlContent, docxOptions);
    return Buffer.from(buffer);
  } catch (error) {
    throw new Error(
      `DOCX conversion failed: ${error instanceof Error ? error.message : String(error)}\n` +
        "Falling back to HTML format is recommended.",
    );
  }
}
