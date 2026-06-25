import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge.js";
import { DashboardSummaryCards } from "../components/dashboard/DashboardSummaryCards.js";
import { api } from "../lib/api.js";
import { useProject } from "../lib/ProjectContext.js";
import type { Run, ProviderConfig, NativeRunnerStatus, DashboardSummary } from "../lib/types.js";
import type { ReactElement } from "react";

export function Dashboard(): ReactElement {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [_summary, setSummary] = useState<DashboardSummary | null>(null);
  const [provider, setProvider] = useState<ProviderConfig | null>(null);
  const [nativeRunner, setNativeRunner] = useState<NativeRunnerStatus | null>(null);
  const { activeProject } = useProject();

  useEffect(() => {
    api
      .health()
      .then(() => { setHealthOk(true); })
      .catch(() => { setHealthOk(false); });

    api
      .getProviderConfig()
      .then(setProvider)
      .catch(() => void 0);

    api
      .getNativeRunnerStatus()
      .then(setNativeRunner)
      .catch(() => void 0);

    const projectId = activeProject?.id;

    Promise.all([
      api.listRuns(projectId),
      api.getDashboardSummary(projectId),
    ])
      .then(([runsData, summaryData]) => {
        setRuns(runsData);
        setSummary(summaryData);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load runs");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeProject?.id]);

  const latestRuns = runs.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of recent runs and system status.</p>
        </div>
        <div>
          {healthOk === true && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Local Mode Active
            </span>
          )}
          {healthOk === false && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Server Offline
            </span>
          )}
          {healthOk === null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-500">
              Checking...
            </span>
          )}
        </div>
      </div>

      {/* Project Summary */}
      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm text-gray-500">Current Project</p>
        <p className="text-lg font-semibold text-gray-900 mt-0.5">{activeProject?.name ?? "auto-code"}</p>
      </div>

      {/* Loading State */}
      {loading && (
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
      )}

      {/* Error State */}
      {!loading && error && (
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
        </div>
      )}

      {/* Summary Cards */}
      {!loading && !error && <DashboardSummaryCards runs={runs} />}

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">AI Provider</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">
            {provider?.provider ?? "Not configured"}
          </p>
          {provider?.model && (
            <p className="text-xs text-gray-400 mt-0.5">Model: {provider.model}</p>
          )}
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Native Runner</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">
            {nativeRunner === null
              ? "Checking..."
              : nativeRunner.available
                ? "Available"
                : "Not found"}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Total Runs</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{runs.length}</p>
        </div>
      </div>

      {/* Latest Runs */}
      {!loading && !error && latestRuns.length > 0 && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Latest Runs</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Title
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Steps
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {latestRuns.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      to={`/runs/${run.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      {run.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {run.totalSteps !== undefined
                      ? `${String(run.completedSteps ?? 0)}/${String(run.totalSteps)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 text-right whitespace-nowrap">
                    {new Date(run.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && runs.length === 0 && (
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
          <p className="mt-4 text-sm font-medium text-gray-900">No runs yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Create a new requirement to see runs and stats here.
          </p>
          <Link
            to="/new"
            className="inline-block mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            New Requirement
          </Link>
        </div>
      )}
    </div>
  );
}
