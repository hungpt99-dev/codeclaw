# Step 41: Integration Planner & DevOps/Release Agent

## Status

Planned

## Priority

P2

## Product Goal

Add integration planning and release management capabilities so the product can plan cross-system integrations, deployment strategies, and release documentation. This makes the product feel like a team that considers the full software delivery lifecycle, not just feature implementation.

## Problem

The current product has no integration planning or release management stages. When a feature requires external system integration (e.g., payment gateway, email service, SSO provider), there is no dedicated artifact that captures integration requirements, API compatibility, error handling, and fallback behavior. Similarly, there is no release planning — changelog, version strategy, deployment notes, or rollback plan.

## Current Evidence

- No `integrationPlannerAgent` or `devopsAgent` files exist
- No integration planning artifacts in run output
- No release planning artifacts in run output
- External integration references (GitHub, Jira, Slack) exist in adapters but not in planning
- No changelog or version strategy generation

## Scope

### In Scope

- Integration Planner Agent: identifies external system touchpoints, documents integration contracts, error handling, fallback behavior, retry strategy
- DevOps/Release Agent: generates release plan, version strategy, changelog, deployment considerations, rollback plan
- Artifacts: `integration-plan.md`, `release-plan.md`, `changelog.md`
- Integration and release sections in final report

### Out of Scope

- Actual CI/CD pipeline configuration
- Infrastructure provisioning
- Docker/Kubernetes manifest generation
- Production deployment execution

## Expected User Value

The product plans not just the feature code but also how it integrates with external systems and how it will be released. This is essential for enterprise features that involve payment gateways, SSO, email services, or third-party APIs.

## Expected Behavior

1. After API/Data designs are ready, Integration Planner identifies external system touchpoints
2. Integration Planner documents integration requirements, error handling, and fallback strategies
3. DevOps/Release Agent generates release plan with version strategy and changelog
4. Both outputs are included in the final delivery report
5. Integration plan feeds into task breakdown for implementation

## Suggested Files / Modules

- `packages/core/src/agents/integrationPlannerAgent.ts`
- `packages/core/src/agents/devopsReleaseAgent.ts`
- `packages/core/src/agents/parsers/integrationPlannerOutputParser.ts`
- `packages/core/src/agents/parsers/devopsReleaseOutputParser.ts`
- `templates/prompts/integration-planner-agent.md`
- `templates/prompts/devops-release-agent.md`
- Updates to `artifactWriter.ts` for new artifact types
- Updates to final report to include integration/release sections

## Implementation Plan

1. Create Integration Planner Agent and prompt template
2. Create DevOps/Release Agent and prompt template
3. Add new artifact types and paths
4. Update workflows to include optional integration/release stages
5. Update final report to include integration and release sections
6. Add tests

## Acceptance Criteria

- Integration Planner identifies external system touchpoints from requirements
- Integration Planner documents error handling and fallback strategies
- DevOps/Release Agent generates version strategy and changelog
- Release plan includes deployment considerations and rollback plan
- Both outputs are optional (configurable)
- Integration plan references API design endpoints

## Tests / Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Security Considerations

Integration plan must not include real API keys, tokens, or credentials. All secrets must use environment variable references.

## Risks

- Integration planning is highly context-dependent and may produce generic output
- Release version strategy requires project knowledge that may not be available

## Dependencies

- Runs after API/Data Design (Step 40)
- Integration plan feeds into Task Planner
- Release plan is used in Final Report

## Notes for AI Coding Agent

Make these stages optional (config enabled). The product should work normally without running them. Focus on practical outputs that would actually be useful: integration requirements table, retry configurations, changelog entries.
