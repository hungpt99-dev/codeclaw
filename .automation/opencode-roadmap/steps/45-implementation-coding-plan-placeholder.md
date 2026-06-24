# Step 45: Implementation Coding Plan Placeholder

## Status

Planned

## Priority

P1

## Product Goal

Add a formal Implementation Coding Plan stage between planning and code execution. This generates a structured `coding-plan.md` artifact that documents exactly what code will be written, which files will be affected, what patterns will be followed, and provides a clear checkpoint before any code execution occurs. This is the bridge between "what to build" and "how to build it."

## Problem

The current workflow jumps from task breakdown/test matrix directly to code execution (in semi-auto mode) or implementation prompt generation (in assisted mode). There is no formal coding plan step that:
- Documents the exact files to be created or modified
- Specifies implementation order
- Defines coding conventions and patterns to follow
- Lists potential risks or challenges
- Provides a checkpoint for user approval before coding

This gap means the user approves a high-level task breakdown but never sees the detailed implementation plan before code execution begins.

## Current Evidence

- `packages/core/src/agents/developerAgent.ts` generates an `implementation-prompt.md` directly
- No `codingPlanStep` or `codingPlanAgent` exists
- No `coding-plan.md` artifact exists in run output
- The approval gate before code is based on the design/tasks, not on the detailed coding plan
- Semi-auto workflow goes from plan approval directly to code execution

## Scope

### In Scope

- Implementation Coding Plan Agent that generates a `coding-plan.md` artifact
- Plan includes: file creation/modification list, implementation order, pattern references, risk notes
- Plan is reviewed before code execution (either by user or as stage artifact)
- Plan updated during fix loop iterations to reflect changes
- Integration with existing Developer Agent (implementation prompt generation)
- Configurable: required or optional before code execution

### Out of Scope

- Actual code execution (handled by semi-auto workflow)
- Implementation prompt generation (handled by Developer Agent)
- Automatic file editing
- Multi-step coding plan execution

## Expected User Behavior

1. After task breakdown and test matrix are approved
2. Implementation Coding Plan Agent generates detailed coding plan
3. User reviews coding plan: sees exactly which files will change and in what order
4. User approves coding plan (or edits it)
5. Developer Agent generates implementation prompt based on approved coding plan
6. Code execution follows the plan

## Expected Behavior

1. Implementation Coding Plan Agent consumes: technical design, API design, DB design, task breakdown, test matrix
2. Agent produces structured `coding-plan.md` with sections for files, order, patterns, risks
3. Plan is saved as run artifact
4. Plan is presented to user before code execution
5. Developer Agent references coding plan when generating implementation prompt
6. After code execution, plan is updated with actual changes

## Suggested Files / Modules

- `packages/core/src/agents/codingPlanAgent.ts`
- `packages/core/src/agents/parsers/codingPlanOutputParser.ts`
- `templates/prompts/coding-plan-agent.md`
- `packages/core/src/workflows/steps/codingPlanStep.ts`
- Updates to `artifactWriter.ts` for coding plan paths
- Updates to workflow to include coding plan stage before code execution

## Implementation Plan

1. Create Coding Plan Agent and prompt template
2. Add coding plan artifact paths
3. Add coding plan stage to assisted and semi-auto workflows
4. Update Developer Agent to reference coding plan
5. Update approval gate to include coding plan review
6. Add tests

## Acceptance Criteria

- Coding Plan Agent generates list of files to create/modify with implementation order
- Coding plan references technical design, API design, and task breakdown
- Coding plan includes pattern references and risk notes
- Coding plan is saved as run artifact
- Coding plan is presented before code execution
- Developer Agent references coding plan in implementation prompt

## Tests / Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Security Considerations

Coding plan must not recommend editing protected files (`.env`, `credentials.json`, etc.) or running dangerous commands.

## Risks

- Adding another approval step may slow down the workflow
- Coding plan may be too detailed for simple features
- If coding plan and implementation diverge, user confusion may result

## Dependencies

- Requires completed task breakdown and test matrix
- Runs before Developer Agent and code execution
- Developer Agent (existing) needs updated to reference coding plan

## Notes for AI Coding Agent

The coding plan should be practical and focused. For simple features (add one API endpoint), the plan may be short. For complex features, the plan should include implementation order, dependencies between files, and testing strategy. Make the plan review optional (configurable).
