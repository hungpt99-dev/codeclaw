import type { ReactElement } from "react";
import type { Run } from "../../lib/types.js";

interface DashboardSummaryCardsProps {
  runs: Run[];
}

export function DashboardSummaryCards({ runs }: DashboardSummaryCardsProps): ReactElement {
  const total = runs.length;
  const completed = runs.filter(
    (r) =>
      r.status === "REPORT_GENERATED" || r.status === "REVIEW_PASSED" || r.status === "TEST_PASSED",
  ).length;
  const running = runs.filter(
    (r) =>
      !["REPORT_GENERATED", "REVIEW_PASSED", "TEST_PASSED", "FAILED", "CANCELLED"].includes(
        r.status,
      ),
  ).length;
  const failed = runs.filter(
    (r) =>
      r.status === "FAILED" ||
      r.status === "CODE_FAILED" ||
      r.status === "TEST_FAILED" ||
      r.status === "REVIEW_FAILED",
  ).length;
  const waiting = runs.filter(
    (r) =>
      r.status === "WAITING_FOR_CODE_APPROVAL" ||
      r.status === "WAITING_FOR_SCOPE_APPROVAL" ||
      r.status === "WAITING_FOR_PLAN_APPROVAL",
  ).length;

  const cards = [
    { label: "Total Runs", value: total, color: "bg-blue-500" },
    { label: "Running", value: running, color: "bg-yellow-500" },
    { label: "Completed", value: completed, color: "bg-green-500" },
    { label: "Failed", value: failed, color: "bg-red-500" },
    { label: "Waiting Approval", value: waiting, color: "bg-purple-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${card.color}`} />
            <span className="text-sm text-gray-500">{card.label}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
