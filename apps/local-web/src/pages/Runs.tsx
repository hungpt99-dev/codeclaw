import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge.js";
import { RunListFilters } from "../components/runs/RunListFilters.js";
import { api } from "../lib/api.js";
import { useProject } from "../lib/ProjectContext.js";
import type { Run } from "../lib/types.js";
import type { ReactElement } from "react";

export function Runs(): ReactElement {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProject } = useProject();

  const statusFilter = searchParams.get("status") ?? "";
  const modeFilter = searchParams.get("mode") ?? "";
  const searchQuery = searchParams.get("q") ?? "";

  useEffect(() => {
    setLoading(true);
    api
      .listRuns(activeProject?.id)
      .then(setRuns)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load runs");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeProject?.id]);

  const updateFilter = (key: string, value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const filtered = runs.filter((run) => {
    if (statusFilter && run.status !== statusFilter) return false;
    if (modeFilter && run.mode !== modeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !run.title.toLowerCase().includes(q) &&
        !run.id.toLowerCase().includes(q) &&
        !run.rawRequirement.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Runs</h1>
          <p className="text-gray-500 mt-1">All execution runs ordered by creation date.</p>
        </div>
        <div className="rounded-lg border bg-white p-6 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading runs...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Runs</h1>
          <p className="text-gray-500 mt-1">All execution runs ordered by creation date.</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-red-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              api
                .listRuns()
                .then(setRuns)
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Failed");
                })
                .finally(() => {
                  setLoading(false);
                });
            }}
            className="mt-3 text-sm text-blue-600 hover:text-blue-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Runs</h1>
        <p className="text-gray-500 mt-1">
          {activeProject ? `Runs for project: ${activeProject.name}` : "All execution runs ordered by creation date."}
        </p>
      </div>

      <RunListFilters
        statusFilter={statusFilter}
        modeFilter={modeFilter}
        searchQuery={searchQuery}
        onStatusChange={(v) => {
          updateFilter("status", v);
        }}
        onModeChange={(v) => {
          updateFilter("mode", v);
        }}
        onSearchChange={(v) => {
          updateFilter("q", v);
        }}
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-900">
            {runs.length === 0
              ? activeProject
                ? `No runs for project "${activeProject.name}"`
                : "No runs yet"
              : "No runs match your filters"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {runs.length === 0
              ? activeProject
                ? "Create a new requirement to see runs here."
                : "Create a new requirement to see runs here."
              : "Try adjusting your search or filters."}
          </p>
          {runs.length === 0 ? (
            <Link
              to="/new"
              className="inline-block mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              New Requirement
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearchParams(new URLSearchParams());
              }}
              className="inline-block mt-4 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Steps
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{run.title}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      {run.mode}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {run.totalSteps !== undefined
                      ? `${String(run.completedSteps ?? 0)}/${String(run.totalSteps)}${(run.failedSteps ?? 0) > 0 ? ` ❌${String(run.failedSteps)}` : ""}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(run.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <Link
                      to={`/runs/${run.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
