import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge.js";
import { api } from "../lib/api.js";
import type { Run } from "../lib/types.js";
import type { ReactElement } from "react";

export function Dashboard(): ReactElement {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [projectName, setProjectName] = useState("auto-code");

  useEffect(() => {
    api
      .health()
      .then(() => {
        setHealthOk(true);
      })
      .catch(() => {
        setHealthOk(false);
      });

    api
      .listSettings()
      .then((settings) => {
        const proj = settings.find((s) => s.key === "project_name");
        if (proj) setProjectName(proj.value);
      })
      .catch(() => {
        /* ignore */
      });

    api
      .listRuns()
      .then(setRuns)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load runs");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const total = runs.length;
  const completed = runs.filter((r) => r.status === "REPORT_GENERATED").length;
  const failed = runs.filter((r) => r.status === "FAILED").length;

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

      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm text-gray-500">Current Project</p>
        <p className="text-lg font-semibold text-gray-900 mt-0.5">{projectName}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-gray-500">Total Runs</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {loading ? "..." : String(total)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">
            {loading ? "..." : String(completed)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-semibold text-red-600 mt-1">
            {loading ? "..." : String(failed)}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            to="/new"
            className="rounded-lg border bg-white p-5 hover:shadow-sm transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">New Requirement</h3>
            <p className="text-sm text-gray-500 mt-1">
              Create a new requirement to run the AI pipeline.
            </p>
          </Link>
          <Link
            to="/runs"
            className="rounded-lg border bg-white p-5 hover:shadow-sm transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">View Runs</h3>
            <p className="text-sm text-gray-500 mt-1">
              Browse all execution runs and their artifacts.
            </p>
          </Link>
          <Link
            to="/settings"
            className="rounded-lg border bg-white p-5 hover:shadow-sm transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">Settings</h3>
            <p className="text-sm text-gray-500 mt-1">Configure the local web application.</p>
          </Link>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Latest Runs</h2>
          {!loading && runs.length > 5 && (
            <Link to="/runs" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all →
            </Link>
          )}
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
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
        ) : error ? (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 mt-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-10 w-10 text-gray-300"
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
            <p className="mt-3 text-sm text-gray-500">
              No runs yet. Create a new requirement to get started.
            </p>
            <Link
              to="/new"
              className="inline-block mt-3 text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Create your first requirement →
            </Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {runs.slice(0, 5).map((run) => (
              <li key={run.id}>
                <Link
                  to={`/runs/${run.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 rounded px-2 -mx-2 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900 truncate mr-4">
                    {run.title}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500">{run.mode}</span>
                    <StatusBadge status={run.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
