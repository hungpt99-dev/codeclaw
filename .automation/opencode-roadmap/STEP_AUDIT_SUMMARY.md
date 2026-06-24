# CodeClaw Roadmap Audit Summary

**Date:** 2026-06-24

## Current Limitations Status

| Limitation | Actual Status | Notes |
|---|---|---|
| Docs-only default mode | Accurate | Assisted and semi-auto exist but require CLI AI tool config |
| No cloud backend | Accurate | Intentional design decision — local-first product |
| No authentication | Accurate | Local-only, no login/user management needed |
| No external integrations | Partial | GitHub, Jira, Slack integrations exist but are optional and undocumented in README |
| Single project | Accurate | One `.codeclaw` per working directory |
| No web diff viewer | Partial | `DiffViewer.tsx` and `DiffFileList.tsx` components exist but may not be connected to run detail page |
| No live workflow progress in web UI | Partial | SSE endpoint exists in server, web UI subscribes via `subscribeToProgress`, but full timeline UI may be incomplete |

## Roadmap Highlights Status

| Item | Actual Status | Step File | Priority | Notes |
|---|---|---|---|---|
| Docs-only workflow | Done | — | P0 | Fully implemented with deterministic templates |
| Assisted workflow mode | Done | — | P1 | Generates implementation prompt |
| Semi-auto workflow mode | Done | — | P1 | Executes code via CLI AI tools |
| AgentBackend abstraction | Done | — | P1 | OpenAI-compatible + Mock providers |
| OpenCode CLI adapter | Done | — | P1 | Production adapter exists |
| Claude Code, Codex, Gemini CLI, Aider adapters | Done | — | P2 | All 4 adapters exist |
| Approval gates before code execution | Done | — | P1 | SCOPE, PLAN, CODE_GENERATION, RISKY_FILE gates |
| Secret redaction utility | Done | — | P1 | `redactSecrets` in shared package |
| Persistent step-level execution tracking | Done | — | P1 | `step_executions` table, CLI commands |
| **All agents using AgentBackend** | **Partial** | `STEP_00_ALL_AGENTS_USE_AGENT_BACKEND.md` | **P2** | Only BA and Architect — 17 agents missing |
| **Ollama/local LLM support** | **Missing** | `STEP_01_OLLAMA_LOCAL_LLM_SUPPORT.md` | **P2** | No local LLM provider at all |
| **Multi-project/workspace support** | **Missing** | `STEP_02_MULTI_PROJECT_WORKSPACE_SUPPORT.md` | **P3** | Single `.codeclaw` per directory |
| Live workflow progress in web UI | Partial | Covered in original step 46 (if exists) | P4 | SSE endpoint exists, web UI subscribes |
| Jira / Slack / GitHub integration | Done | Existing adapters | P5 | All three integrations exist, optional |
| Web diff viewer | Partial | Existing components | P4 | `DiffViewer.tsx` and `DiffFileList.tsx` exist |

## Step Files Created

| File | Feature | Priority |
|---|---|---|
| `steps/STEP_00_ALL_AGENTS_USE_AGENT_BACKEND.md` | All 19 agents use AgentBackend | P2 |
| `steps/STEP_01_OLLAMA_LOCAL_LLM_SUPPORT.md` | Ollama / local LLM provider | P2 |
| `steps/STEP_02_MULTI_PROJECT_WORKSPACE_SUPPORT.md` | Multi-project / workspace support | P3 |

## Features Intentionally NOT Turned Into Steps

| Feature | Reason |
|---|---|
| Cloud backend | Intentional design decision — local-first product. Not a limitation, not a future goal. |
| Authentication / login | Not needed for local-only mode. If remote access is needed, local access token could be added. |
| Jira / Slack / GitHub integration | Already implemented. Optional, configurable via env vars. No new step needed. |
| Live workflow progress in web UI | SSE endpoint and web UI subscription exist. May need UI polish but not a new feature step. |
| Web diff viewer | `DiffViewer.tsx` and `DiffFileList.tsx` components exist. May need integration but not a new feature step. |

## Remaining Risks

- README shows integrations as "planned" but they are actually implemented (optional). Update README to reflect this.
- The `.automation/opencode-roadmap/steps/` directory was previously cleared — existing numbered steps (1-51) no longer exist. These 3 new steps start fresh with a new naming convention.
- README limitations are accurate and honest — no stale claims.

## Recommended Next Implementation Step

**STEP 00: All Agents Use AgentBackend (P2)**

This is the highest-impact missing feature. 17 out of 19 agents still don't use the LLM provider users configure. Implementing this makes the product feel like a complete AI software team rather than a half-AI, half-deterministic tool.

Start with simple agents (PO, QA, Reporter) and work toward complex ones (Developer, Reviewer).
