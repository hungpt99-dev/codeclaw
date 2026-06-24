# Step 43: Dedicated Code Review & Security Review Agents

## Status

Planned

## Priority

P1

## Product Goal

Replace the generic review service with dedicated Code Reviewer and Security Reviewer agents that produce structured, role-specific review reports. This makes the review stage feel like a real code review and security audit performed by specialized team members.

## Problem

The current review system (`packages/core/src/review/reviewService.ts`) uses a single review service that produces a combined review report. There are no dedicated Code Reviewer or Security Reviewer agents with their own prompt templates, parsers, and output formats. The review prompt templates (`templates/prompts/reviewer-agent.md`, `security-reviewer-agent.md`) exist but are consumed by a generic service rather than dedicated agents.

## Current Evidence

- `packages/core/src/review/reviewService.ts` — combined review service, not dedicated agents
- `packages/core/src/review/deterministicReview.ts` — deterministic fallback for combined review
- `templates/prompts/reviewer-agent.md` — exists but consumed by generic service
- `templates/prompts/security-reviewer-agent.md` — exists but consumed by generic service
- No `codeReviewerAgent.ts` or `securityReviewerAgent.ts` files
- No reviewer output parsers
- Review and security review are not independently triggerable

## Scope

### In Scope

- Code Reviewer Agent: dedicated agent with its own prompt template, parser, and output format
- Security Reviewer Agent: dedicated agent with its own prompt template, parser, and output format
- Independent trigger: user can run code review or security review separately
- Structured output: `review-report.md`, `security-review.md` with consistent sections
- Deterministic fallback for both reviewers
- Both agents follow the same pattern as existing agents (dual-mode: AI + deterministic)

### Out of Scope

- Automated security vulnerability scanning (SAST/DAST integration)
- License compliance checking
- Dependency vulnerability scanning

## Expected User Value

Code review and security review become independently actionable stages. The user can run a security review without running a full code review. Outputs are more specialized and structured. Each reviewer produces output that reflects its specific domain expertise.

## Expected Behavior

1. After code generation and test execution, Code Reviewer Agent runs
2. Code Reviewer produces structured review report with requirement coverage, code quality, test coverage
3. Security Reviewer Agent runs independently with security-focused output
4. Both agents can be triggered separately via CLI: `codeclaw review --code`, `codeclaw review --security`
5. Both agents produce deterministic fallback when no AI CLI is available
6. Review artifacts feed into fix loop and final report

## Suggested Files / Modules

- `packages/core/src/agents/codeReviewerAgent.ts`
- `packages/core/src/agents/securityReviewerAgent.ts`
- `packages/core/src/agents/parsers/codeReviewerOutputParser.ts`
- `packages/core/src/agents/parsers/securityReviewerOutputParser.ts`
- Refactor `reviewService.ts` to delegate to dedicated agents
- Update CLI commands for independent review triggers

## Implementation Plan

1. Create Code Reviewer Agent with structured output format
2. Create Security Reviewer Agent with security-focused output format
3. Create output parsers for both reviewers
4. Refactor review service to delegate to dedicated agents
5. Add independent CLI triggers for code review and security review
6. Update workflows to use dedicated agents
7. Add tests

## Acceptance Criteria

- Code Reviewer Agent produces structured review with requirement coverage table
- Security Reviewer Agent produces security-focused review with risk assessment
- Both reviewers can be triggered independently
- Both reviewers have deterministic fallback
- Existing `codeclaw review --all` still works (runs both)
- Review outputs are consistent across AI and deterministic modes

## Tests / Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Security Considerations

Security review output might reference sensitive code patterns. Ensure output does not include actual secrets found in code.

## Risks

- Security review without real SAST integration may miss actual vulnerabilities
- Domain-specific security knowledge depends on AI CLI capability

## Dependencies

- Requires code generation output (semi-auto workflow) or manually provided diff
- Requires test results for test quality assessment
- Builds on existing review prompt templates

## Notes for AI Coding Agent

Keep the existing `reviewService.ts` as an orchestrator that calls both agents. The deterministic fallback for code review should check: file count, LOC changed, test file ratio, and basic pattern matching. The security fallback should check for: hardcoded strings matching secret patterns, dangerous function calls, unprotected endpoints.
