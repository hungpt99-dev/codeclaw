# Step 30: Review Engine — `codeclaw review`

Implement Step 30: Review Engine — `codeclaw review`.

## Background

The docs define a Review Engine (Technical SS22, CLI Spec SS26, Workflow SS7.12) as Stage 12 in the workflow. After code execution and test results are available, the review engine checks: requirement coverage, code quality, test coverage, security risks, unrelated changes, missing edge cases.

The review is performed by feeding all artifacts (requirement, design, tests, diff, test results, changed files) to the user's AI CLI tool (Claude Code / Codex via Step 18's agent runner) with a review prompt.

Outputs: `review-report.md`, `security-review.md`, `requirement-coverage.md`.

## Tasks

### 1. Create review prompt template

Create `templates/prompts/reviewer-agent.md`:

```
You are a Code Reviewer. Review the following implementation against the original requirement, design, and test plan.

## Requirement
{{clarifiedRequirement}}

## Acceptance Criteria
{{acceptanceCriteria}}

## Technical Design
{{technicalDesign}}

## Changed Files
{{changedFiles}}

## Diff
{{diff}}

## Test Results
{{testResults}}

## Instructions
1. Check if all acceptance criteria are covered by the implementation
2. Check if tests exist for new code
3. Check for unrelated changes (files modified that shouldn't be)
4. Check for security risks (exposed secrets, missing auth, injection risks)
5. Check code quality (complexity, maintainability, conventions)
6. Identify missing edge cases

## Output Format
## Review Summary
[APPROVED | APPROVED_WITH_WARNINGS | CHANGES_REQUIRED]

## Requirement Coverage
| Criteria | Status | Notes |
|----------|--------|-------|

## Code Quality
[Issues found]

## Test Quality
[Issues found]

## Security
[Issues found]

## Required Fixes
1. ...
```

Also create `templates/prompts/security-reviewer-agent.md` for security-specific review.

### 2. Create review service

Create `packages/core/src/review/reviewService.ts`:

```typescript
export interface ReviewInput {
  runId: string;
  clarifiedRequirement: string;
  acceptanceCriteria: string;
  technicalDesign: string;
  changedFiles: string;
  diff: string;
  testResults: string;
}

export interface ReviewOutput {
  reviewReport: string;
  securityReview: string;
  requirementCoverage: string;
  overallStatus: "APPROVED" | "APPROVED_WITH_WARNINGS" | "CHANGES_REQUIRED";
}

export async function runReview(
  input: ReviewInput,
  options?: { templateDir?: string; aiTool?: any },
): Promise<ReviewOutput>
```

Implementation:
1. Load review artifacts from run directory
2. Build review context (requirement, design, diff, test results)
3. If AI CLI available: pipe review prompt to `claude --print` with all context
4. If AI CLI not available: use deterministic template with structured summary
5. Parse output into structured sections
6. Return review results

### 3. Create deterministic review fallback

Create `packages/core/src/review/deterministicReview.ts`:

When no AI CLI is available, generate a structured review based on available data:
- Requirement coverage: list acceptance criteria and mark which have corresponding test cases
- Code quality: basic checks (file count, changed LOC, file types)
- Test quality: pass/fail ratio, test count
- Security: check if any changed files match sensitive patterns

### 4. Create CLI command: codeclaw review

Create `apps/cli/src/commands/review.ts`:

```bash
codeclaw review --run <runId>
codeclaw review --run <runId> --security
codeclaw review --run <runId> --coverage
codeclaw review --run <runId> --all
```

Options:
- `--run <runId>` — Required
- `--security` — Run security review only
- `--coverage` — Run requirement coverage review only
- `--all` — Run all review types (default)
- `--regenerate` — Regenerate existing review

Register in CLI entry point.

### 5. Add review artifacts to paths

Update `packages/core/src/artifacts/artifactWriter.ts`:

```typescript
reviewDir: string;
reviewReportPath: string;
securityReviewPath: string;
requirementCoveragePath: string;
```

### 6. Wire review into semi-auto workflow

Update `packages/core/src/workflows/semiAutoWorkflow.ts`:

After test execution:
1. Collect diff, changed files, test results
2. Run review
3. Save review artifacts
4. Update run status to REVIEW_PASSED or REVIEW_FAILED

### 7. Add review tab in web UI

In `apps/local-web/src/pages/RunDetail.tsx`:

Add "Review" tab after "Tests" tab:
- Review summary with status badge (APPROVED / CHANGES_REQUIRED)
- Requirement coverage table
- Code quality section
- Security review section
- Required fixes checklist
- [Run Review] button
- [Run Security Review] button

### 8. Add review API routes

Update `packages/server/src/routes/runs.routes.ts`:

```typescript
// POST /api/runs/:id/review — Trigger review
// GET /api/runs/:id/review — Get review artifacts
```

### 9. Add tests

- Test review service with mock AI CLI
- Test deterministic fallback review generation
- Test review output parsing
- Test CLI command

## Acceptance Criteria

- `codeclaw review --run <runId>` generates review-report.md, security-review.md, requirement-coverage.md
- Review with AI CLI produces contextual analysis
- Deterministic fallback produces structured review without AI CLI
- Web UI shows Review tab with all sections
- Semi-auto workflow runs review automatically after tests
- All existing tests pass

## Files to Create

- `templates/prompts/reviewer-agent.md`
- `templates/prompts/security-reviewer-agent.md`
- `packages/core/src/review/reviewService.ts`
- `packages/core/src/review/deterministicReview.ts`
- `apps/cli/src/commands/review.ts`

## Files to Modify

- `packages/core/src/artifacts/artifactWriter.ts`
- `packages/core/src/workflows/semiAutoWorkflow.ts`
- `packages/core/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/local-web/src/pages/RunDetail.tsx`
- `apps/local-web/src/lib/api.ts`
- `apps/local-web/src/lib/types.ts`
- `packages/server/src/routes/runs.routes.ts`
