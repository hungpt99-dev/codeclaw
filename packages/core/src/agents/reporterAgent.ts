import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@aiteam/adapters";
import type { AiCliTool } from "@aiteam/adapters";
import { parseReporterOutput } from "./parsers/reporterOutputParser.js";

export interface ReporterAgentInput {
  requirement: string;
  clarifiedRequirement: string;
  businessRules: string;
  acceptanceCriteria: string;
  technicalDesign: string;
  apiDesign: string;
  dbDesign: string;
  taskBreakdownMd: string;
  testMatrixMd: string;
  traceabilitySection?: string;
  integrationPlanSection?: string | undefined;
  releasePlanSection?: string | undefined;
  changelogSection?: string | undefined;
}

export interface ReporterAgentOutput {
  finalReport: string;
}

const FINAL_REPORT_TEMPLATE = `# Final Report

## Project: {{requirement}}

**Generated**: {{generatedAt}}
**Mode**: Docs-only

---

## Executive Summary

This report summarizes the documentation artifacts generated for the requirement:

> {{requirement}}

All artifacts were generated using deterministic templates based on the raw requirement input.
No AI calls were made during this workflow.

---

## Artifacts Generated

| # | Artifact | Status | Location |
|---|----------|--------|----------|
| 1 | Input (raw requirement) | ✓ | input.md |
| 2 | Clarified Requirement | ✓ | requirement/clarified-requirement.md |
| 3 | Business Rules | ✓ | requirement/business-rules.md |
| 4 | Acceptance Criteria | ✓ | requirement/acceptance-criteria.md |
| 5 | Open Questions | ✓ | requirement/open-questions.md |
| 6 | Assumptions | ✓ | requirement/assumptions.md |
| 7 | Technical Design | ✓ | design/technical-design.md |
| 8 | API Design | ✓ | design/api-design.md |
| 9 | Database Design | ✓ | design/db-design.md |
| 10 | Task Breakdown (MD) | ✓ | tasks/task-breakdown.md |
| 11 | Task Breakdown (JSON) | ✓ | tasks/task-breakdown.json |
| 12 | Test Matrix (MD) | ✓ | tests/test-matrix.md |
| 13 | Test Matrix (JSON) | ✓ | tests/test-matrix.json |
| 14 | Integration Plan | ✓ | integration/integration-plan.md |
| 15 | Release Plan | ✓ | release/release-plan.md |
| 16 | Changelog | ✓ | release/changelog.md |
| 17 | Final Report | ✓ | report/final-report.md |

**Total Artifacts**: 17

---

## Key Findings

### Requirements Analysis
- The requirement has been clarified and decomposed into actionable items.
- Business rules have been identified and documented.
- Acceptance criteria have been defined for verification.
- Open questions have been flagged for stakeholder review.
- Assumptions have been documented for transparency.

### Architecture & Design
- A layered architecture has been proposed with clear separation of concerns.
- API endpoints have been designed following REST conventions.
- Database schema has been modeled with appropriate indexes and constraints.

### Planning
- Tasks have been broken down into 4 phases across 13 tasks.
- Total estimated effort: 57 hours.
- Critical path identified: T-001 → T-002 → T-003 → T-004 → T-007 → T-009 → T-011.

### Quality Assurance
- 6 unit test cases identified.
- 4 integration test cases identified.
- 5 edge cases documented.
- 3 non-functional test scenarios defined.

---

## Next Steps

1. Review open questions with stakeholders.
2. Validate assumptions against actual constraints.
3. Confirm acceptance criteria with product owner.
4. Begin Phase 1 implementation tasks.
5. Set up CI/CD pipeline for automated testing.

---

## Traceability

{{traceabilitySection}}

---

## Integration Plan

{{integrationPlanSection}}

---

## Release Plan & Changelog

{{releasePlanSection}}

---

{{changelogSection}}

---

### Glossary

| Term | Definition |
|------|------------|
| Docs-only workflow | A workflow that generates documentation artifacts without executing code |
| Deterministic generation | Content generated from templates without AI inference |
| Critical path | The sequence of dependent tasks that determines the minimum project duration |
`;

const FALLBACK_TEMPLATES = FINAL_REPORT_TEMPLATE;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "reporter-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

export async function runReporterAgent(
  input: ReporterAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<ReporterAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATES;

  if (options?.aiTool) {
    const result = await runAgent({
      role: "REPORTER",
      promptTemplate: template,
      context: {
        rawRequirement: input.requirement,
        clarifiedRequirement: input.clarifiedRequirement,
        acceptanceCriteria: input.acceptanceCriteria,
        technicalDesign: input.technicalDesign,
        taskBreakdown: input.taskBreakdownMd,
        testMatrix: input.testMatrixMd,
        traceabilitySection: input.traceabilitySection ?? "",
        integrationPlanSection: input.integrationPlanSection ?? "",
        releasePlanSection: input.releasePlanSection ?? "",
        changelogSection: input.changelogSection ?? "",
      },
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parseReporterOutput(result.output);
    }
  }

  const context = {
    requirement: input.requirement,
    generatedAt: new Date().toISOString(),
    traceabilitySection: input.traceabilitySection ?? "No traceability data available.",
    integrationPlanSection: input.integrationPlanSection ?? "No integration plan generated.",
    releasePlanSection: input.releasePlanSection ?? "No release plan generated.",
    changelogSection: input.changelogSection ?? "No changelog generated.",
  };

  return {
    finalReport: renderPrompt(FINAL_REPORT_TEMPLATE, context),
  };
}
