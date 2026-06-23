# Step 28: Document Export — Markdown to DOCX/PDF/HTML

## Mandatory Documentation Context Rule

This `opencode run` is a fresh session.

Do not rely on memory from previous OpenCode runs.

Before writing or modifying code, read the required project documentation once for this session.

After you have read the docs once in this same session, you do not need to read them again unless:

- you modify documentation files,
- you discover documentation changed,
- you are unsure about the architecture,
- you are about to make a decision that may conflict with the docs.

If this is a separate `opencode run`, a retry run, or a fix attempt, read the docs again because it is a new session.

## Docs to Read Once Per Session

Read these docs if they exist:

- README.md
- docs/DOCS_INDEX.md
- docs/AI_AGENT_RULES.md
- docs/ARCHITECTURE.md
- docs/DEVELOPMENT.md
- docs/CODE_QUALITY.md
- docs/CONTRIBUTING.md
- docs/SECURITY.md

Step-specific docs:

- docs/CLI_COMMAND_SPEC.md
- docs/PRD.md
- docs/LOCAL_WEB_UI_SPEC.md

Also inspect the current repository structure:

- package.json
- pnpm-workspace.yaml
- tsconfig.base.json
- apps/
- packages/
- templates/
- .automation/opencode-roadmap/

If PDF versions exist under docs/, treat them as exported/reference documents.
Prefer Markdown files as source of truth when available.
Do not read PDF files directly if equivalent Markdown files already exist.

## Session Docs Checklist

At the beginning of this session, create an internal checklist:

- [ ] Docs loaded
- [ ] Repo structure inspected
- [ ] Step objective understood
- [ ] Files to modify identified

After docs are loaded once, mark `Docs loaded` as done in your own working notes.
Do not create a physical file for this checklist unless needed.
This checklist is for the current OpenCode session only.

## Pre-Code Summary

Before coding, summarize:

1. Docs read in this session
2. Existing architecture
3. Current step objective
4. Existing files relevant to this step
5. Files you plan to modify

Only then implement the step.

## Common Implementation Rules

- Implement only this step.
- Read required docs once at the start of this OpenCode session.
- Do not rely on memory from previous OpenCode runs.
- Do not reread the same docs repeatedly within the same session unless docs changed or you are unsure.
- Inspect current repo structure before changing files.
- Do not implement future roadmap steps.
- Do not add cloud backend.
- Do not add login.
- Do not add billing.
- Do not add desktop app.
- Do not make Jira, Slack, or GitHub required.
- Jira, Slack, and GitHub must remain optional advanced integrations.
- The app must work without Jira, Slack, or GitHub config.
- Do not bypass quality checks.
- Do not weaken scripts just to pass checks.
- Do not remove tests just to make checks pass.
- Keep changes minimal and focused.
- Prefer updating existing files over creating duplicates.
- At the end, summarize docs read, changed files, and commands run.

---

Implement Step 28: Document Export — Markdown to DOCX/PDF/HTML.

## Background

Currently all generated artifacts are plain Markdown files. For professional delivery, users need to export documents as `.docx` (Word), `.pdf`, or `.html` to share with clients, stakeholders, or non-technical team members.

The CLI already has an `aiteam export` command planned (CLI Spec §31). This step implements it with support for multiple output formats:

```bash
aiteam export <runId> --format docx    # Word document
aiteam export <runId> --format pdf     # PDF
aiteam export <runId> --format html    # Single HTML page
aiteam export <runId> --format zip     # All formats bundled
aiteam export <runId> --format markdown   # Original markdown (default)
```

This step builds a document conversion service that converts markdown artifacts into professional-looking documents. All conversion happens locally — no cloud services.

## Tasks

### 1. Choose document conversion approach

Evaluate options:

**For DOCX:**
- `html-to-docx` — Convert HTML to DOCX, lightweight
- `docx` (npm package) — Build DOCX from scratch programmatically
- Pandoc (external CLI) — Most powerful but requires external install

**Recommended MVP approach for DOCX:**
- Convert markdown → HTML (using `marked` which is already common)
- Convert HTML → DOCX (using `html-to-docx` package)
- Keep it simple, no external dependencies beyond npm

**For PDF:**
- `puppeteer` — Headless Chrome, most reliable but heavy
- `playwright` — Already in dev deps, can reuse
- `md-to-pdf` — Lightweight but limited

**Recommended MVP approach for PDF:**
- Convert markdown → HTML
- Use `playwright` (already available) to print HTML to PDF
- This avoids adding new heavy dependencies

**For HTML:**
- Convert markdown → styled HTML with a document theme
- Inline CSS for a clean, print-friendly look

### 2. Create markdown-to-HTML converter

Create `packages/adapters/src/export/mdToHtml.ts`:

```typescript
export interface HtmlDocumentOptions {
  title: string;
  cssTheme?: "professional" | "simple" | "modern";
  includeTableOfContents?: boolean;
  includeHeader?: boolean;
  includeFooter?: boolean;
}

export async function convertMdToHtml(
  markdownContent: string,
  options: HtmlDocumentOptions,
): Promise<string>
```

Implementation:
- Use `marked` to parse markdown to HTML
- Wrap in a styled HTML document with:
  - Professional CSS theme (fonts, spacing, colors, table styles, code block styles)
  - Table of contents generated from headings
  - Header with document title and date
  - Footer with page number and "Generated by AITeam"
- Use a clean, professional theme suitable for client delivery

### 3. Create HTML-to-DOCX converter

Create `packages/adapters/src/export/htmlToDocx.ts`:

```typescript
export interface DocxOptions {
  title: string;
  author?: string;
  company?: string;
}

export async function convertHtmlToDocx(
  htmlContent: string,
  options: DocxOptions,
): Promise<Buffer>
```

Implementation:
- Use `html-to-docx` npm package
- Convert the styled HTML to a Word document
- Set document properties (title, author, company)
- Return buffer for file writing

### 4. Create HTML-to-PDF converter

Create `packages/adapters/src/export/htmlToPdf.ts`:

```typescript
export interface PdfOptions {
  title: string;
  pageSize?: "A4" | "Letter";
  margin?: { top: number; right: number; bottom: number; left: number };
}

export async function convertHtmlToPdf(
  htmlContent: string,
  options: PdfOptions,
): Promise<Buffer>
```

Implementation:
- Use `playwright` (already in devDependencies) to launch headless browser
- Load the HTML content
- Print to PDF with proper page settings
- Return buffer

Fallback: if playwright/chromium is not available, print clear error message with instructions.

### 5. Create document export service

Create `packages/adapters/src/export/exportService.ts`:

```typescript
export type ExportFormat = "markdown" | "html" | "docx" | "pdf" | "zip";

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
  format: ExportFormat;
  fileSize: number;
  error?: string;
}

export async function exportRunArtifacts(
  runId: string,
  artifacts: ArtifactRecord[],
  options: ExportOptions,
): Promise<ExportResult>
```

Logic:
1. Read all artifact files from run directory
2. Combine into a single document (or keep separate based on format)
3. For DOCX/PDF/HTML: combine all artifacts into one structured document
   - Title page with run info
   - Table of contents
   - Each artifact as a chapter (Requirement, Design, Tasks, Tests, Report)
4. Convert using the appropriate converter
5. Write to output path
6. Return result

For ZIP format:
- Collect all files from run directory
- Create ZIP archive with proper folder structure
- Include markdown originals + optionally DOCX/PDF versions

### 6. Create CLI command: aiteam export

Create `apps/cli/src/commands/export.ts`:

```bash
aiteam export <runId> --format docx --output ./delivery/report.docx
aiteam export <runId> --format pdf --output ./delivery/report.pdf
aiteam export <runId> --format html --output ./delivery/report.html
aiteam export <runId> --format zip --output ./delivery/run-export.zip
aiteam export <runId> --format markdown --output ./delivery/docs/
```

Options:
- `--format <format>` — Output format (default: markdown)
- `--output <path>` — Output file or directory path
- `--include-logs` — Include log files
- `--include-diff` — Include diff patch (if available)
- `--title <title>` — Document title (default: run title)
- `--author <author>` — Document author

Register in CLI entry point:

```typescript
program
  .command("export")
  .description("Export run artifacts to various formats")
  .argument("<runId>")
  .option("--format <format>", "Output format", "markdown")
  .option("--output <path>", "Output path")
  .option("--include-logs", "Include log files")
  .option("--include-diff", "Include diff patch")
  .option("--title <title>", "Document title")
  .option("--author <author>", "Document author")
  .action(exportCommand);
```

### 7. Add export button in web UI

In `apps/local-web/src/pages/RunDetail.tsx`:

Add "Export" button/modal:
- Click opens export dialog
- Select format: Markdown, HTML, DOCX, PDF, ZIP
- Options: Include logs, Include diff
- For DOCX/PDF: Title, Author fields
- [Export] button triggers download
- Progress/status feedback

### 8. Add export API routes

Update `packages/server/src/routes/runs.routes.ts`:

```typescript
// POST /api/runs/:id/export — Generate and download export
// Body: { format, includeLogs, includeDiff, title, author }
// Response: file download or { downloadUrl }
```

### 9. Add CSS themes for HTML export

Create `packages/adapters/src/export/themes/`:

- `professional.css` — Clean, formal, suitable for enterprise clients
  - Serif fonts (Georgia), blue accent, formal headers
- `simple.css` — Minimal, suitable for internal use
  - Sans-serif, gray scale, compact
- `modern.css` — Modern, suitable for startups
  - Clean sans-serif, accent color, card-style sections

Each theme includes styles for:
- Headings (h1–h6)
- Tables (bordered, striped)
- Code blocks (monospace, syntax colors)
- Blockquotes
- Lists
- Page break between chapters
- Header/footer

### 10. Add dependencies

Update `packages/adapters/package.json`:

```json
{
  "dependencies": {
    "marked": "^15.0.0",
    "html-to-docx": "^1.9.0"
  },
  "optionalDependencies": {
    "playwright": "^1.52.0"
  }
}
```

`marked` and `html-to-docx` are required (npm packages, no external tools).
`playwright` is optional — PDF export is skipped if not available.

### 11. Handle missing dependencies gracefully

If `playwright` is not installed:
- `aiteam export --format pdf` should print:
  ```
  PDF export requires Playwright.
  Install: npx playwright install chromium
  Or try: aiteam export --format docx
  ```
- Never crash — always show helpful message

If `html-to-docx` fails:
- Fall back to HTML export with a note

### 12. Add tests

- Test markdown-to-HTML conversion with sample artifacts
- Test HTML-to-DOCX conversion
- Test HTML-to-PDF conversion (skip if playwright not available)
- Test export service with mock artifacts
- Test CLI command with mock
- Test ZIP creation
- Test error handling for missing dependencies
- Test CSS theme application

## Acceptance Criteria

- `aiteam export <runId> --format docx` generates a Word document
- `aiteam export <runId> --format pdf` generates a PDF (when playwright available)
- `aiteam export <runId> --format html` generates a styled HTML file
- `aiteam export <runId> --format zip` generates a ZIP archive
- `aiteam export <runId> --format markdown` copies markdown files (default)
- Exported DOCX/PDF/HTML documents are professional-looking and include all artifacts
- Web UI shows Export button/modal with format selection
- Missing optional dependencies show helpful messages, not crashes
- All existing tests pass

## Files to Create

- `packages/adapters/src/export/exportService.ts`
- `packages/adapters/src/export/mdToHtml.ts`
- `packages/adapters/src/export/htmlToDocx.ts`
- `packages/adapters/src/export/htmlToPdf.ts`
- `packages/adapters/src/export/themes/professional.css`
- `packages/adapters/src/export/themes/simple.css`
- `packages/adapters/src/export/themes/modern.css`
- `apps/cli/src/commands/export.ts`

## Files to Modify

- `packages/adapters/package.json` (add marked, html-to-docx, optional playwright)
- `packages/adapters/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/local-web/src/pages/RunDetail.tsx`
- `apps/local-web/src/lib/api.ts`
- `apps/local-web/src/lib/types.ts`
- `packages/server/src/routes/runs.routes.ts`

## Rules

Implement only this step.
Do not implement future roadmap steps.
All document conversion must happen locally — no cloud services.
Use lightweight npm packages for DOCX conversion (not Pandoc).
Use Playwright for PDF (already in devDeps, but make it optional — fallback gracefully).
Do not add cloud backend.
Do not add login.
Do not add billing.
Do not add desktop app.
Do not add Jira/Slack/GitHub integration.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
