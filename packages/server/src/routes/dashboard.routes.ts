import type { FastifyInstance } from "fastify";
import type { DbConnection } from "@codeclaw/storage";
import { createRunRepository } from "@codeclaw/storage";

export function registerDashboardRoutes(app: FastifyInstance, db: DbConnection): void {
  app.get("/api/dashboard/summary", async (request, _reply) => {
    void request.query;
    const runRepo = createRunRepository(db);
    const runs = runRepo.findAll();

    const running = runs.filter(
      (r) =>
        r.status === "CREATED" ||
        r.status === "SPEC_GENERATED" ||
        r.status === "CODING" ||
        r.status === "TESTING",
    ).length;
    const completed = runs.filter(
      (r) =>
        r.status === "REPORT_GENERATED" ||
        r.status === "TEST_PASSED" ||
        r.status === "REVIEW_PASSED",
    ).length;
    const failed = runs.filter(
      (r) =>
        r.status === "FAILED" ||
        r.status === "CODE_FAILED" ||
        r.status === "TEST_FAILED" ||
        r.status === "REVIEW_FAILED" ||
        r.status === "CANCELLED",
    ).length;
    const waitingApproval = runs.filter((r) => r.status.startsWith("WAITING_FOR_")).length;

    runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const firstRun = runs.length > 0 ? runs[0] : undefined;
    const latestRun = firstRun
      ? {
          id: firstRun.id,
          title: firstRun.title,
          status: firstRun.status,
          createdAt: firstRun.createdAt,
        }
      : null;

    return {
      totalRuns: runs.length,
      running,
      completed,
      failed,
      waitingApproval,
      latestRun,
    };
  });
}
