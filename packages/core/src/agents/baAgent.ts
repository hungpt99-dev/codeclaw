import { renderPrompt } from "../prompts/promptRenderer.js";

export interface BaAgentInput {
  requirement: string;
}

export interface BaAgentOutput {
  clarifiedRequirement: string;
  businessRules: string;
  acceptanceCriteria: string;
  openQuestions: string;
  assumptions: string;
}

const CLARIFIED_REQUIREMENT_TEMPLATE = `# Clarified Requirement

## Original Requirement
{{requirement}}

## Clarification
This document captures the refined understanding of the requirement above.

### Functional Scope
- The system MUST fulfill the core intent described in the requirement.
- All interactions MUST be traceable to the original requirement.

### Non-Functional Scope
- The system SHOULD be maintainable and testable.
- The system SHOULD follow standard conventions for the target platform.

### Constraints
- Implementation MUST stay within the scope defined by the requirement.
- No external service dependencies unless explicitly stated.

## Stakeholders
- Product Owner
- Development Team
- QA Team
`;

const BUSINESS_RULES_TEMPLATE = `# Business Rules

## Rules Derived from: {{requirement}}

### Core Rules
| ID | Rule | Priority | Category |
|----|------|----------|----------|
| BR-001 | The system must fulfill the primary requirement as stated | High | Functional |
| BR-002 | Input validation must be applied to all user-facing inputs | High | Data Integrity |
| BR-003 | Error states must be handled gracefully with user feedback | Medium | UX |
| BR-004 | The system must maintain data consistency across operations | High | Data Integrity |
| BR-005 | All operations must be idempotent where applicable | Medium | Reliability |

### Validation Rules
- All required fields must be present before processing.
- Data formats must conform to expected schemas.
- Boundary conditions must be explicitly handled.

### Authorization Rules
- Access control must be enforced at the appropriate level.
- Actions must be auditable.
`;

const ACCEPTANCE_CRITERIA_TEMPLATE = `# Acceptance Criteria

## Criteria for: {{requirement}}

### Functional Acceptance
| ID | Criterion | Given | When | Then |
|----|-----------|-------|------|------|
| AC-001 | Core functionality works | A valid input is provided | The system processes it | The expected output is produced |
| AC-002 | Invalid input handled | An invalid input is provided | The system attempts to process it | An appropriate error is returned |
| AC-003 | Edge case: empty input | No input or empty input | The system receives it | A clear validation message is shown |
| AC-004 | Edge case: maximum input | Input at maximum allowed size | The system processes it | Processing completes without error |
| AC-005 | Happy path completes | All preconditions are met | The user triggers the action | The action completes successfully |

### Non-Functional Acceptance
| ID | Criterion | Threshold |
|----|-----------|-----------|
| NAC-001 | Response time | Under 2 seconds for typical operations |
| NAC-002 | Error rate | Less than 1% under normal load |
| NAC-003 | Test coverage | At least 80% line coverage |
`;

const OPEN_QUESTIONS_TEMPLATE = `# Open Questions

## Questions for: {{requirement}}

### Clarification Needed
1. **Scope Boundaries**: What are the exact boundaries of this requirement? Are there adjacent features that should be considered in scope or out of scope?
2. **Target Users**: Who are the primary users of this functionality? What is their technical proficiency level?
3. **Performance Expectations**: What are the expected throughput and latency requirements?
4. **Data Retention**: How long should data be retained? Are there any compliance requirements (GDPR, HIPAA, etc.)?
5. **Integration Points**: Does this requirement depend on or integrate with any existing systems?

### Risks
1. **Ambiguity Risk**: If the requirement is not sufficiently detailed, implementation may diverge from stakeholder expectations.
2. **Scope Creep Risk**: Without clear boundaries, adjacent features may inflate the implementation effort.
3. **Technical Debt Risk**: Rushing implementation without proper design may incur future maintenance costs.

### Decisions Pending
- Final confirmation of scope boundaries
- Agreement on performance SLAs
- Sign-off on acceptance criteria
`;

const ASSUMPTIONS_TEMPLATE = `# Assumptions

## Assumptions for: {{requirement}}

### Technical Assumptions
1. The target environment supports standard modern tooling and runtimes.
2. Standard security practices (input sanitization, output encoding) are sufficient.
3. The system will run in a single-tenant or appropriately isolated environment.
4. Network connectivity is available and reliable for any required communications.

### Business Assumptions
1. The requirement as stated captures the full intent of stakeholders.
2. No regulatory or compliance requirements beyond standard best practices.
3. The priority of this requirement is as communicated by the product owner.
4. The timeline allows for proper design, implementation, and testing.

### User Assumptions
1. Users have basic familiarity with similar systems or interfaces.
2. Users will follow standard interaction patterns.
3. Error messages and documentation will be read when issues arise.

### Data Assumptions
1. Input data conforms to expected formats and schemas.
2. Data volume is within typical ranges for the application type.
3. No sensitive data requires special handling beyond standard encryption.
`;

export function runBaAgent(input: BaAgentInput): BaAgentOutput {
  const context = { requirement: input.requirement };

  return {
    clarifiedRequirement: renderPrompt(CLARIFIED_REQUIREMENT_TEMPLATE, context),
    businessRules: renderPrompt(BUSINESS_RULES_TEMPLATE, context),
    acceptanceCriteria: renderPrompt(ACCEPTANCE_CRITERIA_TEMPLATE, context),
    openQuestions: renderPrompt(OPEN_QUESTIONS_TEMPLATE, context),
    assumptions: renderPrompt(ASSUMPTIONS_TEMPLATE, context),
  };
}
