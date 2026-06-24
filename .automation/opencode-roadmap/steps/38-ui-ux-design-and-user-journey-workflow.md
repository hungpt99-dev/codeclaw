# Step 38: UI/UX Design & User Journey Workflow

## Status

Planned

## Priority

P1

## Product Goal

Add UI/UX design capability to the product so it can generate user journeys, screen descriptions, component breakdowns, and UX writing artifacts. This is essential for the product to feel like a full software team that handles both functional and experience design.

## Problem

The current product generates requirement docs, technical designs, API designs, and task breakdowns — but never generates any UI/UX design output. A full software team would include UX researchers, UI designers, and UX writers. Without this step, the product feels incomplete for frontend or full-stack features.

## Current Evidence

- No `uxAgent`, `uiDesignerAgent`, or `userJourneyAgent` files exist
- No user journey artifacts in run output (`user-journey.md`, `ui-design.md`, `ux-copy.md`)
- Architect Agent generates technical design only, no UI/UX considerations
- No prompt templates for UX roles
- Frontend features like "Add login page" get only backend-focused output

## Scope

### In Scope

- User Journey Agent: maps user personas, journeys, flows
- UI/UX Designer Agent: generates screen descriptions, component tree, layout, states (empty/loading/error)
- UX Writing Agent: generates interface labels, error messages, empty state text, tooltips
- Artifacts: `user-journey.md`, `ux-design.md`, `ux-copy.md`, `component-breakdown.md`
- UI/UX section added to run detail web UI

### Out of Scope

- Actual visual mockups (images, Figma exports)
- CSS code generation
- Interactive prototypes
- Design system token generation

## Expected User Value

User gets a complete UX package alongside technical documents. For a frontend feature like "Add login page", the product now generates user flow, screen description, component list, state handling, and interface copy — not just API endpoints.

## Expected Behavior

1. After requirement clarification and scope, User Journey Agent generates personas and flows
2. UI/UX Designer Agent generates screen descriptions, component tree, and states
3. UX Writing Agent generates interface copy for all screens
4. All artifacts are saved and viewable in web UI
5. Frontend Planner (future step) can reference UX artifacts

## Suggested Files / Modules

- `packages/core/src/agents/userJourneyAgent.ts`
- `packages/core/src/agents/uiDesignerAgent.ts`
- `packages/core/src/agents/uxWriterAgent.ts`
- `packages/core/src/agents/parsers/userJourneyOutputParser.ts`
- `packages/core/src/agents/parsers/uiDesignerOutputParser.ts`
- `packages/core/src/agents/parsers/uxWriterOutputParser.ts`
- `templates/prompts/user-journey-agent.md`
- `templates/prompts/ui-designer-agent.md`
- `templates/prompts/ux-writer-agent.md`
- Updates to `artifactWriter.ts` for new artifact types
- Updates to workflows to include UX stages

## Implementation Plan

1. Create User Journey Agent and prompt template
2. Create UI/UX Designer Agent and prompt template
3. Create UX Writing Agent and prompt template
4. Add new artifact types and paths
5. Add UX stage to docs-only and assisted workflows
6. Add UX tab to web UI run detail
7. Add tests

## Acceptance Criteria

- User Journey Agent generates personas, user flows, and journey maps
- UI/UX Designer Agent generates screen descriptions with component lists
- UX Writing Agent generates interface copy for all identified screens
- Artifacts are saved and viewable in web UI
- UX output references requirement and acceptance criteria

## Tests / Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Security Considerations

No secrets involved. UX copy should not include sensitive information.

## Risks

- Generated UX output may be too generic without visual context
- User expectations for visual output may exceed text-only capability

## Dependencies

- Requires BA Agent and PO Agent output as input context
- Should run after scope definition and before technical planning

## Notes for AI Coding Agent

Use templates that produce structured markdown output: tables for components, bullet lists for states, numbered steps for user flows. Do not attempt to generate images or CSS.
