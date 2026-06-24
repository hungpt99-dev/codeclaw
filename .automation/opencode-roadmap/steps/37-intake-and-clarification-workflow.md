# Step 37: Intake & Clarification Workflow

## Status

Planned

## Priority

P1

## Product Goal

Add formal requirement intake and bidirectional clarification to make the product feel like a real software team. Instead of blindly generating docs from raw input, the system should detect input quality, ask the user targeted questions when requirements are vague, and produce a structured intake record before the BA agent processes the requirement.

## Problem

Currently the BA Agent receives raw requirement text and produces outputs directly. There is no formal intake step that:
- Assesses input quality and completeness
- Detects input language
- Asks the user structured clarification questions
- Waits for user answers before proceeding
- Produces a formal intake artifact

This makes the product feel like a passive template filler rather than an active team member that helps refine vague ideas.

## Current Evidence

- `packages/core/src/agents/baAgent.ts` takes `{ requirement: string }` and immediately produces output without Q&A
- No intake agent or intake stage exists in the workflow
- No structured Q&A flow between system and user
- No intake artifact (`intake-assessment.md`, `clarification-questions.md`) exists
- Workflow runs all stages sequentially without pause for clarification

## Scope

### In Scope

- Intake Agent that assesses raw requirement quality
- Language detection (Vietnamese, English, bilingual)
- Structured question generation for vague or incomplete requirements
- Q&A session state machine (pending → answered → resolved)
- User can answer questions via CLI or web UI
- Intake assessment artifact saved to run
- Support for continuing with assumptions when user skips questions
- Integration with existing BA Agent

### Out of Scope

- Natural language conversation (use structured Q&A)
- Slack-based Q&A
- Voice input
- Multi-turn deep conversation trees

## Expected User Value

User feels the product actively helps clarify vague ideas instead of silently making assumptions. The product asks intelligent questions before generating any documentation, reducing the risk of wrong output.

## Expected Behavior

1. User enters rough requirement
2. Intake Agent analyzes requirement quality
3. If requirement is clear: produce brief assessment, proceed
4. If requirement is vague: generate structured questions, pause workflow
5. User answers questions (or chooses to continue with assumptions)
6. Intake assessment + user answers are saved as run artifacts
7. BA Agent receives enriched input with user answers

## Suggested Files / Modules

- `packages/core/src/agents/intakeAgent.ts`
- `packages/core/src/agents/parsers/intakeOutputParser.ts`
- `templates/prompts/intake-agent.md`
- `packages/core/src/workflows/steps/intakeStep.ts`
- `packages/core/src/workflows/steps/clarificationStep.ts`
- Web UI updates for Q&A display in run detail

## Implementation Plan

1. Create Intake Agent with quality assessment logic
2. Create intake prompt template
3. Create structured question generator
4. Add Q&A state to run status model
5. Update workflow to pause for clarification when needed
6. Update CLI and API to support answering questions
7. Update web UI to show Q&A panel
8. Add tests

## Acceptance Criteria

- Intake Agent correctly identifies vague vs clear requirements
- Structured questions are generated for incomplete inputs
- User can answer questions via CLI and web UI
- Workflow pauses and resumes correctly
- Intake assessment artifact is saved
- Language detection works for Vietnamese and English

## Tests / Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Security Considerations

No secrets involved in this step.

## Risks

- Over-asking questions may frustrate users who want quick results
- Language detection may be inaccurate for mixed-language input

## Dependencies

Requires completed docs-only workflow (Step 05) and BA Agent (existing).

## Notes for AI Coding Agent

Keep the Q&A simple: generate 3-7 targeted questions based on missing information. Do not build a full chatbot. Use structured JSON for Q&A state.
