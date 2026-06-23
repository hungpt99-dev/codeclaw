# Step 35: Approval Gates 4-6 — Risky File, External Update, Rollback

Implement Step 35: Approval Gates 4-6.

## Background

Workflow Design SS9.1 defines 6 required approval gates. Step 20 implemented Gates 1-2 (Requirement, Plan). Step 24 partially covers Gate 3 (Code). This step implements Gates 4-6.

- **Gate 4: Risky File** — If AI modifies sensitive or warning files, user must approve continuation
- **Gate 5: External Update** — Before updating Jira/Slack/GitHub, user must approve
- **Gate 6: Rollback** — Before rollback, user must confirm

## Tasks

### 1. Implement Gate 4: Risky File

In `packages/core/src/policies/safetyPolicy.ts` (from Step 24):

```typescript
export interface FileRiskResult {
  blocked: string[];   // Files modified that are in deny list
  warnings: string[];  // Files modified that are in warn list
  safe: string[];      // All other files
  requiresApproval: boolean;  // True if any blocked or warning files
}
```

When code execution completes:
1. Run changed files against deny/warn lists
2. If blocked files touched → create RISKY_FILE approval gate, stop workflow
3. If warning files touched → create gate (or just warn based on config)
4. User approves or rejects
5. If approved → continue; if rejected → rollback

### 2. Implement Gate 5: External Update

In integration adapters (from Steps 25-27):

Before any external API call:
1. Check `requireApprovalBeforeExternalUpdate` config
2. If true, create EXTERNAL_UPDATE approval gate
3. Show in approval UI: what will happen, target system, message preview
4. User approves or rejects

### 3. Implement Gate 6: Rollback

In `apps/cli/src/commands/rollback.ts` (from Step 34):

Before rollback executes:
1. Show diff of what will be reverted
2. Create ROLLBACK approval gate
3. User must explicitly confirm

### 4. Add gate types to schema

```typescript
export type ApprovalGate =
  | "REQUIREMENT"
  | "PLAN"
  | "CODE_GENERATION"
  | "RISKY_FILE"
  | "EXTERNAL_UPDATE"
  | "ROLLBACK"
  | "SCOPE";    // Added by Step 32
```

### 5. Update approval UI

In web UI, each gate shows:
- Gate 4: changed files list with risk level, diff preview
- Gate 5: target system logo, message preview
- Gate 6: files to revert, diff preview

## Acceptance Criteria

- Gate 4 blocks workflow when protected files are modified
- Gate 5 requires approval before any external API call
- Gate 6 requires confirmation before rollback
- All gates use same approval infrastructure from Step 20
- Web UI shows appropriate content per gate type
- CLI `aiteam approve --gate` works for all gate types
