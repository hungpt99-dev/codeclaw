# Step 39: Frontend & Backend Planner Agents

## Status

Planned

## Priority

P1

## Product Goal

Split the generic Architect Agent into specialized Frontend Planner and Backend Planner agents. This produces more detailed, stack-specific technical designs and makes the product feel like a team with dedicated frontend and backend architects.

## Problem

The current Architect Agent (`packages/core/src/agents/architectAgent.ts`) generates a single technical design document that covers everything generically. It does not distinguish between frontend and backend concerns. When the requirement is full-stack, the output is too shallow for either layer. Real software teams have separate frontend and backend architects who produce focused designs.

## Current Evidence

- `packages/core/src/agents/architectAgent.ts` generates a combined `technical-design.md`, `api-design.md`, `db-design.md`
- No frontend-specific artifact exists
- No backend-specific artifact exists
- Output is generic regardless of stack (Java, Node, React all get the same format)
- Frontend Planner and Backend Planner types exist nowhere

## Scope

### In Scope

- Frontend Planner Agent: component tree, state management, routing, data flow, UI framework patterns
- Backend Planner Agent: service layer, controllers, middleware, business logic, error handling
- Artifact split: `frontend-design.md`, `backend-design.md` separate from `api-design.md` and `db-design.md`
- Config option to select which planners to run (frontend-only, backend-only, both)
- Architect Agent refactored to orchestrate both planners or run as fallback

### Out of Scope

- Mobile platform planning (iOS/Android)
- Microservice decomposition planning
- Infrastructure-as-code planning

## Expected User Value

Frontend features get proper component architecture, state management design, and data flow documentation. Backend features get proper service layer design with controller/service/repository separation. Full-stack features get both, properly coordinated.

## Expected Behavior

1. After requirement and scope are approved, workflow determines if frontend, backend, or both planners should run
2. Frontend Planner generates component tree, state management approach, routing design, data fetching strategy
3. Backend Planner generates service layer, controller design, middleware chain, error handling strategy
4. Both outputs reference shared API/DB design from later steps (Step 40)
5. Task Planner uses both frontend and backend designs for task breakdown

## Suggested Files / Modules

- `packages/core/src/agents/frontendPlannerAgent.ts`
- `packages/core/src/agents/backendPlannerAgent.ts`
- `packages/core/src/agents/parsers/frontendPlannerOutputParser.ts`
- `packages/core/src/agents/parsers/backendPlannerOutputParser.ts`
- `templates/prompts/frontend-planner-agent.md`
- `templates/prompts/backend-planner-agent.md`
- Updates to `artifactWriter.ts` for new artifact types
- Updates to workflows to route through appropriate planners

## Implementation Plan

1. Create Frontend Planner Agent and prompt template
2. Create Backend Planner Agent and prompt template
3. Add frontend/backend artifact types and paths
4. Add project type detection for auto-selecting planners (React → frontend, Spring Boot → backend)
5. Update workflow to route through planners
6. Add tests

## Acceptance Criteria

- Frontend Planner generates component tree with state management design
- Backend Planner generates service layer with controller/service/repository separation
- Planners are auto-selected based on detected project type
- User can manually override planner selection
- Existing Architect Agent still works as combined fallback

## Tests / Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Security Considerations

No secrets involved.

## Risks

- Frontend/backend separation adds workflow complexity
- Some projects may not clearly fit frontend or backend categories
- Combined Architect Agent remains available as fallback

## Dependencies

- Requires UI/UX Design step (Step 38) for frontend context
- Runs before API/Data Design (Step 40)
- Requires completed BA and PO agents

## Notes for AI Coding Agent

Create prompt templates that ask the AI to produce structured design documents with specific sections relevant to each layer. Frontend should include component hierarchy, state shape, event handling. Backend should include controller endpoints, service methods, repository queries.
