# Step 42: Technical Documentation Agent

## Status

Planned

## Priority

P2

## Product Goal

Add a dedicated Technical Documentation Agent that transforms all generated artifacts into developer-facing technical documentation. This ensures the product delivers not just implementation instructions but also setup guides, API reference documentation, and maintenance guides — outputs a real software team would produce.

## Problem

The current Reporter Agent generates a final delivery report that summarizes the workflow. However, there is no agent dedicated to producing standalone technical documentation artifacts such as:
- API reference documentation (beyond the design doc)
- Setup and installation guides
- Configuration reference
- Maintenance and operations guide
- README updates

These are outputs that a real technical writing team member would produce.

## Current Evidence

- `packages/core/src/agents/reporterAgent.ts` generates a single `final-report.md`
- No `technicalDocumentationAgent` file exists
- No standalone technical documentation artifacts exist
- No setup guide, API reference, or maintenance guide artifacts
- Users who want documentation must regenerate from report manually

## Scope

### In Scope

- Technical Documentation Agent that consumes all run artifacts and generates:
  - `api-reference.md` — standalone API documentation
  - `setup-guide.md` — installation and configuration guide
  - `technical-reference.md` — architecture overview, module descriptions
  - `operations-guide.md` — deployment, monitoring, maintenance notes
- Documentation artifacts saved in a `docs/` subdirectory within the run
- Documentation generation is optional and configurable

### Out of Scope

- Publishing to Confluence, Notion, or GitHub Wiki (future integration)
- PDF generation (handled by Export step)
- Automatic README modification of the target project

## Expected User Value

User gets production-quality documentation alongside code implementation. The API reference can be shared with integration partners. The setup guide can be used by new team members. The operations guide helps with deployment and maintenance.

## Expected Behavior

1. After all workflow stages complete, Technical Documentation Agent runs (if enabled)
2. Agent consumes all artifacts: requirement, design, API spec, data design, tasks, test plan
3. Agent generates standalone documentation files
4. Documentation is saved in run's `docs/` subdirectory
5. Documentation is included in export package
6. Final report references the generated documentation

## Suggested Files / Modules

- `packages/core/src/agents/technicalDocumentationAgent.ts`
- `packages/core/src/agents/parsers/technicalDocOutputParser.ts`
- `templates/prompts/technical-documentation-agent.md`
- Updates to `artifactWriter.ts` for `docs/` paths
- Updates to export service to include docs
- Updates to workflows to include optional documentation stage

## Implementation Plan

1. Create Technical Documentation Agent and prompt template
2. Add `docs/` directory to artifact paths
3. Add documentation generation as optional workflow stage
4. Update export service to include documentation artifacts
5. Add tests

## Acceptance Criteria

- Technical Documentation Agent generates API reference from API design artifacts
- Setup guide includes installation steps, configuration, and dependencies
- Technical reference includes architecture overview and module descriptions
- Documentation is optional (configurable per run)
- Documentation is included in export packages
- Documentation references acceptance criteria and tasks

## Tests / Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Security Considerations

Documentation must not include real secrets, tokens, passwords, or internal URLs. All configuration examples must use placeholder values.

## Risks

- Documentation from deterministic fallback may be skeletal
- Quality depends heavily on AI CLI capability when AI mode is enabled

## Dependencies

- Runs after all design and planning stages complete
- Should run before or alongside Final Report generation
- Can run independently on existing completed runs

## Notes for AI Coding Agent

Make documentation generation a distinct workflow step with its own enable flag. The template should produce developer-friendly markdown with code examples, configuration tables, and command references.
