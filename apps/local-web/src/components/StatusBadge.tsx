import type { ReactElement } from "react";

const STATUS_LABELS: Record<string, string> = {
  CREATED: "Created",
  SPEC_GENERATED: "Spec Generated",
  WAITING_FOR_REQUIREMENT_APPROVAL: "Waiting for Requirement Approval",
  PLAN_GENERATED: "Plan Generated",
  WAITING_FOR_PLAN_APPROVAL: "Waiting for Plan Approval",
  REPORT_GENERATED: "Report Generated",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  CREATED: "bg-yellow-100 text-yellow-800",
  SPEC_GENERATED: "bg-blue-100 text-blue-800",
  WAITING_FOR_REQUIREMENT_APPROVAL: "bg-amber-100 text-amber-800",
  PLAN_GENERATED: "bg-blue-100 text-blue-800",
  WAITING_FOR_PLAN_APPROVAL: "bg-amber-100 text-amber-800",
  REPORT_GENERATED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export function StatusBadge({ status }: { status: string }): ReactElement {
  const label = STATUS_LABELS[status] ?? status;
  const color = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {label}
    </span>
  );
}
