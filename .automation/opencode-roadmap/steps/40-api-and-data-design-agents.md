# Step 40: API Design & Data Design Agents

## Status

Planned

## Priority

P1

## Product Goal

Split the API and database design responsibilities from the generic Architect Agent into dedicated agents. This produces contract-first API specifications and thorough database design documentation, making the product feel like a team with API and data specialists.

## Problem

The current Architect Agent generates API design and database design as part of a single combined document. API contracts are not independently versioned or reviewable. Database designs lack migration strategy, indexing recommendations, and data flow diagrams. Real teams have API designers who produce OpenAPI specs and data architects who design schemas with migration plans.

## Current Evidence

- `packages/core/src/agents/architectAgent.ts` produces `api-design.md` and `db-design.md` as sections of one document
- No dedicated API Design Agent exists
- No dedicated Data Design Agent exists
- No OpenAPI/Swagger output format
- No migration strategy or data flow artifacts
- API and DB designs cannot be independently regenerated

## Scope

### In Scope

- API Design Agent: contract-first API specification, endpoint definitions, request/response schemas, status codes, error responses, auth requirements
- Data Design Agent: database schema, entity relationships, migration strategy, indexing recommendations, data flow, seed data plan
- Artifact split: `api-design.md` + `api-spec.json` (OpenAPI-compatible), `db-design.md` + `db-schema.sql`
- Support for independent regeneration of API or DB design
- API and DB outputs feed into Frontend and Backend Planners

### Out of Scope

- Swagger UI generation
- Actual database migration file creation
- API client code generation
- GraphQL schema design

## Expected User Value

API designs become independently reviewable and match OpenAPI conventions. Database designs include migration strategy and indexing. The user can regenerate API design without losing database work and vice versa.

## Expected Behavior

1. After frontend/backend plans are ready, API Design Agent generates endpoint contracts
2. Data Design Agent generates database schema and migration strategy
3. API and DB designs are cross-referenced by the Integration Planner (Step 41)
4. Designs are saved as separate artifacts with JSON machine-readable formats
5. Task Planner uses API/DB designs for detailed task breakdown

## Suggested Files / Modules

- `packages/core/src/agents/apiDesignAgent.ts`
- `packages/core/src/agents/dataDesignAgent.ts`
- `packages/core/src/agents/parsers/apiDesignOutputParser.ts`
- `packages/core/src/agents/parsers/dataDesignOutputParser.ts`
- `templates/prompts/api-design-agent.md`
- `templates/prompts/data-design-agent.md`
- Updates to artifact writer for new artifact types and paths
- JSON OpenAPI-compatible output format

## Implementation Plan

1. Create API Design Agent with OpenAPI-compatible output
2. Create Data Design Agent with schema + migration strategy output
3. Add new artifact types and paths
4. Update workflows to include API/Data design steps
5. Make API and DB designs independently regeneratable
6. Add tests

## Acceptance Criteria

- API Design Agent produces endpoint definitions with request/response schemas
- API output includes OpenAPI-compatible JSON
- Data Design Agent produces entity definitions with relationships
- Data output includes migration strategy and indexing recommendations
- API and DB designs can be regenerated independently
- Designs cross-reference each other

## Tests / Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Security Considerations

API design output must not include real credentials, secrets, or production configuration values.

## Risks

- OpenAPI output from deterministic agents may be limited in complexity
- Stack-specific database patterns (Prisma, TypeORM, Flyway) are hard to generate correctly without AI

## Dependencies

- Runs after Frontend/Backend Planners (Step 39)
- API output is used by Integration Planner (Step 41)
- Data output feeds into Task Planner

## Notes for AI Coding Agent

For deterministic fallback, generate structured tables for endpoints and entities. For AI mode, prompt for OpenAPI-compatible YAML/JSON. Always include auth requirements, validation rules, and error responses in API designs.
