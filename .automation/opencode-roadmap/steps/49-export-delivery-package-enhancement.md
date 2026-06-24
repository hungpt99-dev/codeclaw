# Step 49: Export Delivery Package Enhancement

## Status

Planned

## Priority

P2

## Product Goal

Enhance the export system to produce a comprehensive delivery package that includes all run artifacts in multiple formats (ZIP, combined Markdown, JSON). The exported package should be suitable for sharing with stakeholders, attaching to Jira tickets, or archiving as a delivery record.

## Problem

The current export system (`packages/adapters/src/export/exportService.ts`) supports exporting individual artifacts to Markdown, HTML, DOCX, and PDF. However, there is no single-command export that produces a complete delivery package containing all artifacts in a well-organized format. Users who want to share the full delivery output must manually collect and organize files.

## Current Evidence

- `packages/adapters/src/export/exportService.ts` — supports per-format export
- `packages/adapters/src/export/mdToHtml.ts` — markdown to HTML conversion
- `packages/adapters/src/export/htmlToDocx.ts` — HTML to DOCX conversion
- `packages/adapters/src/export/htmlToPdf.ts` — HTML to PDF conversion
- `apps/cli/src/commands/export.ts` — CLI export command
- No unified "delivery package" export that combines all artifacts
- No table of contents or navigation in exported packages
- No ZIP export that preserves artifact directory structure

## Scope

### In Scope

- Combined delivery package: single ZIP file containing all run artifacts with preserved directory structure
- Combined Markdown file: all artifacts merged into one document with table of contents
- Combined JSON export: all artifacts as structured JSON for programmatic consumption
- Export command enhancement: `aiteam export --run <runId> --format package` or `--format zip`
- Delivery package includes: metadata file with run info, artifact index, traceability matrix, final report
- Export from web UI with download button
- Configurable export profile (which artifacts to include)

### Out of Scope

- Cloud storage export (S3, GCS)
- Email delivery of export
- Automated export on workflow completion
- Watermarking or branding on exported documents

## Expected User Value

Users can produce a professional delivery package with a single command. The ZIP file can be shared with clients, attached to Jira tickets, or archived for compliance. The combined Markdown file is suitable for documentation portals. The JSON export enables programmatic processing.

## Expected Behavior

1. `aiteam export --run <runId> --format zip` produces a ZIP file with all artifacts
2. `aiteam export --run <runId> --format combined-md` produces a single Markdown file with TOC
3. `aiteam export --run <runId> --format json` produces a structured JSON file
4. `aiteam export --run <runId> --format all` produces all formats
5. ZIP preserves the `requirement/`, `design/`, `tasks/`, `tests/`, `report/` directory structure
6. Combined Markdown includes: cover page, table of contents, all artifacts in logical order
7. JSON export includes: metadata, artifacts with content, traceability matrix, status
8. Web UI has an "Export" button on run detail page that triggers export
9. Export destination is configurable (default: current directory or `./export/`)

## Suggested Files / Modules

- `packages/adapters/src/export/deliveryPackage.ts` — combined export orchestrator
- `packages/adapters/src/export/zipBuilder.ts` — ZIP file builder
- `packages/adapters/src/export/combinedMdBuilder.ts` — combined Markdown builder
- `packages/adapters/src/export/jsonExporter.ts` — JSON export builder
- Updates to `apps/cli/src/commands/export.ts` for new formats
- Updates to web UI export button
- Updates to API routes for export download

## Implementation Plan

1. Create ZIP builder that preserves artifact directory structure
2. Create combined Markdown builder with TOC and cover page
3. Create JSON exporter with structured format
4. Create delivery package orchestrator
5. Update CLI export command with new formats
6. Add export API route for download
7. Add export button to web UI run detail
8. Add tests

## Acceptance Criteria

- ZIP export preserves artifact directory structure
- Combined Markdown includes table of contents and all artifacts
- JSON export includes metadata, artifacts, and traceability
- Run metadata (title, mode, status, dates) is included in all formats
- CLI export command works with `--format zip|combined-md|json|all`
- Web UI has export button with format selection
- Exported files are valid and readable

## Tests / Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Security Considerations

Exported packages must not include secrets, API keys, or sensitive configuration. The export should respect the same rules as the safety policy — protected file content must not be included.

## Risks

- ZIP files of large runs may be several MB
- PDF conversion quality depends on HTML-to-PDF engine
- Combined Markdown for complex runs may be very long

## Dependencies

- Built on existing `exportService.ts` infrastructure
- Requires all artifact types to exist
- Existing CLI command for modifications

## Notes for AI Coding Agent

Reuse the existing HTML/DOCX/PDF converters where possible. For ZIP, use the archiver package (check package.json for availability). The combined Markdown should have front matter with run metadata, then a table of contents, then each artifact as a section.
