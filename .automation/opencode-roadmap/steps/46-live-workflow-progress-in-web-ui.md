# Step 46: Live Workflow Progress in Web UI

## Status

Planned

## Priority

P2

## Product Goal

Add real-time workflow progress visualization to the web UI so users can see what the AI team is doing at each moment. This transforms the run detail page from a static artifact viewer into a live control center that shows ongoing activity, completed stages, current stage details, and next steps.

## Problem

Currently, the web UI shows workflow results only after stages complete. There is no live progress indicator during workflow execution. Users who start a workflow from the web UI see a loading state until the entire workflow finishes, which can take minutes for complex runs. This creates uncertainty about whether the system is working, stuck, or failed.

## Current Evidence

- Web UI run detail page fetches completed artifacts only
- No progress endpoint exists in the API
- No event stream (SSE/WebSocket) for real-time updates
- CLI shows progress via console output, but web UI does not
- Workflow status is stored in SQLite but not streamed to the UI
- Users cannot see which agent is currently running or what stage is active

## Scope

### In Scope

- SSE (Server-Sent Events) endpoint for real-time workflow progress
- Workflow progress event types: stage started, stage completed, agent started, agent completed, artifact generated, warning, error
- Web UI progress timeline showing: completed stages, current active stage, pending stages
- Agent activity indicator showing which agent role is currently working
- Estimated stage duration or completion percentage
- Auto-refresh of artifact content as stages complete
- Progress restored on page reload (from SQLite state)

### Out of Scope

- WebSocket implementation (SSE is simpler and sufficient)
- Real-time diff streaming during code execution
- Live agent log streaming (can be separate)
- Multi-user collaboration

## Expected User Value

Users can watch the AI software team work in real time. They see which agent is active, what stage is running, and what artifacts have been generated. The experience feels more like observing a team than waiting for a batch job.

## Expected Behavior

1. User starts workflow from web UI
2. Workflow stages emit progress events: STAGE_STARTED, STAGE_COMPLETED, AGENT_STARTED, AGENT_COMPLETED, ARTIFACT_GENERATED, ERROR
3. Web UI subscribes to SSE endpoint and updates progress display
4. Progress timeline shows: completed stages (green), current stage (active blue), pending stages (gray)
5. Current agent indicator shows: "BA Agent is analyzing requirement..."
6. Artifact sections auto-populate as stages complete
7. On page reload, progress state is restored from last saved workflow status

## Suggested Files / Modules

- `packages/server/src/routes/progress.routes.ts` — SSE endpoint
- `packages/core/src/workflows/workflowEmitter.ts` — event emitter for workflow progress
- `apps/local-web/src/components/WorkflowTimeline.tsx` — progress timeline component
- `apps/local-web/src/components/AgentActivityIndicator.tsx` — current agent display
- Updates to workflow runner to emit progress events
- Updates to web UI run detail to subscribe to SSE

## Implementation Plan

1. Create workflow progress event types in shared
2. Create workflow event emitter in core
3. Update workflow runner to emit progress events
4. Create SSE route for progress streaming
5. Create WorkflowTimeline component
6. Create AgentActivityIndicator component
7. Update RunDetail page to subscribe and display progress
8. Add tests

## Acceptance Criteria

- SSE endpoint streams workflow progress events
- Web UI shows real-time progress timeline
- Current agent activity is displayed with agent role name
- Completed stages show green indicator
- Active stage shows animated blue indicator
- Pending stages show gray indicator
- Artifact sections auto-update as stages complete
- Progress persists across page reloads

## Tests / Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Security Considerations

SSE endpoint is local-only, no authentication needed. No sensitive data in progress events — only stage names, agent roles, and status.

## Risks

- SSE connection may be interrupted; need reconnection logic
- Long-running workflows may need keepalive pings
- Adding events to workflow runner increases complexity

## Dependencies

- Requires workflow runner to be instrumented with event emission
- Web UI must already support run detail page (Step 13)

## Notes for AI Coding Agent

Use Node.js EventEmitter for workflow events. For SSE, use Fastify's built-in reply.raw.write. Keep event payloads small (stage name, status, agent role, timestamp). Add reconnection handling in the web UI client.
