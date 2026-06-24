import type { ReactElement } from "react";

interface RunListFiltersProps {
  statusFilter: string;
  modeFilter: string;
  searchQuery: string;
  onStatusChange: (status: string) => void;
  onModeChange: (mode: string) => void;
  onSearchChange: (query: string) => void;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "REPORT_GENERATED", label: "Completed" },
  { value: "RUNNING", label: "Running" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "WAITING_FOR_CODE_APPROVAL", label: "Waiting Approval" },
];

const MODE_OPTIONS = [
  { value: "", label: "All Modes" },
  { value: "docs-only", label: "Docs Only" },
  { value: "assisted", label: "Assisted" },
  { value: "semi-auto", label: "Semi-Auto" },
];

export function RunListFilters({
  statusFilter,
  modeFilter,
  searchQuery,
  onStatusChange,
  onModeChange,
  onSearchChange,
}: RunListFiltersProps): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search runs by title or ID..."
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
          }}
          className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => {
          onStatusChange(e.target.value);
        }}
        className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        value={modeFilter}
        onChange={(e) => {
          onModeChange(e.target.value);
        }}
        className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {MODE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
