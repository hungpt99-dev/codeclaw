# Step 32: Scope Stage + Product Owner Agent

Implement Step 32: Scope Stage + Product Owner Agent.

## Background

Workflow Design SS4.3 defines a Product Owner Agent role and SS7.3 defines Stage 3: Scope Definition. It comes after Requirement Clarification and before Repository Analysis.

Currently the workflow jumps directly from requirement to design. The Scope stage is missing.

The PO Agent defines: MVP scope, out-of-scope items, priorities, success criteria. Outputs: `scope-definition.md`, `out-of-scope.md`, `success-criteria.md`.

## Tasks

### 1. Create PO Agent prompt template

Create `templates/prompts/po-agent.md`:

```
You are a Product Owner. Based on the clarified requirement and acceptance criteria, define the scope for this delivery.

## Clarified Requirement
{{clarifiedRequirement}}

## Acceptance Criteria
{{acceptanceCriteria}}

## Open Questions
{{openQuestions}}

## Assumptions
{{assumptions}}

## Instructions
1. Define the product goal for this delivery
2. List what is IN scope (MVP)
3. List what is OUT of scope (future)
4. Set priorities for each feature
5. Define success criteria

## Output Format
## Product Goal
...
## MVP Scope
- Feature 1 (Priority: High)
- Feature 2 (Priority: Medium)
## Out of Scope
- Feature 3
- Feature 4
## Success Criteria
...
```

### 2. Create PO Agent

Create `packages/core/src/agents/poAgent.ts`:

```typescript
export interface PoAgentInput {
  clarifiedRequirement: string;
  acceptanceCriteria: string;
  openQuestions: string;
  assumptions: string;
}

export interface PoAgentOutput {
  scopeDefinition: string;
  outOfScope: string;
  successCriteria: string;
}
```

Follow same pattern as Step 18: load template, use AI CLI if available, fallback to deterministic.

### 3. Update workflow to include scope stage

Update `packages/core/src/workflows/docsOnlyWorkflow.ts`:
- After BA agent, before Architect agent: run PO Agent
- Save scope artifacts

### 4. Add scope artifacts to paths

Update `packages/core/src/artifacts/artifactWriter.ts`:
```typescript
scopeDir: string;
scopeDefinitionPath: string;
outOfScopePath: string;
successCriteriaPath: string;
```

### 5. Create CLI command: aiteam scope

Create `apps/cli/src/commands/scope.ts`:

```bash
aiteam scope --run <runId>
aiteam scope --run <runId> --strict
aiteam scope --run <runId> --regenerate
```

### 6. Add scope tab in web UI

In RunDetail, add "Scope" tab between "Requirement" and "Design":
- Product Goal
- MVP Scope checklist
- Out of Scope list
- Success Criteria
- [Approve Scope], [Edit], [Regenerate]

### 7. Wire approval gate for scope

Reuse Gate system from Step 20: SCOPE gate (new gate type).

## Acceptance Criteria

- `aiteam scope --run <runId>` generates scope artifacts
- PO Agent prompt template exists
- Scope stage runs after requirement, before design in workflow
- Web UI shows Scope tab
- Scope artifacts saved to run directory
