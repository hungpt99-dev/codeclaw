import type { ReactElement } from "react";

const statusColors: Record<string, string> = {
  CREATED: "bg-yellow-100 text-yellow-800",
  SPEC_GENERATED: "bg-blue-100 text-blue-800",
  PLAN_GENERATED: "bg-blue-100 text-blue-800",
  REPORT_GENERATED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export function StatusBadge({ status }: { status: string }): ReactElement {
  const color = statusColors[status] ?? "bg-gray-100 text-gray-800";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {status}
    </span>
  );
}
