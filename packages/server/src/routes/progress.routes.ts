import type { FastifyInstance } from "fastify";
import { getWorkflowEmitter, getEventHistory } from "@aiteam/core";
import type { WorkflowProgressEvent } from "@aiteam/shared";

export function registerProgressRoutes(app: FastifyInstance): void {
  app.get("/api/runs/:id/progress", async (request, reply) => {
    const { id } = request.params as { id: string };

    const raw = reply.raw;
    raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const history = getEventHistory(id);
    for (const event of history) {
      raw.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    const emitter = getWorkflowEmitter();

    const onEvent = (event: WorkflowProgressEvent): void => {
      raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    emitter.on(`progress:${id}`, onEvent);

    const keepalive = setInterval(() => {
      raw.write(": keepalive\n\n");
    }, 30000);

    request.raw.on("close", () => {
      emitter.off(`progress:${id}`, onEvent);
      clearInterval(keepalive);
    });
  });
}
