import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import type { Run } from "../lib/types.js";
import type { ReactElement } from "react";

export function Dashboard(): ReactElement {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listRuns()
      .then(setRuns)
      .catch(() => undefined)
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const total = runs.length;
  const completed = runs.filter((r) => r.status === "REPORT_GENERATED").length;
  const failed = runs.filter((r) => r.status === "FAILED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of recent runs and system status.</p>
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
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Recent Runs</h2>
        {loading ? (
          <p className="text-sm text-gray-500 mt-3">Loading...</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-gray-500 mt-3">
            No runs yet. Create a new requirement to get started.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {runs.slice(0, 5).map((run) => (
              <li key={run.id} className="text-sm text-gray-700">
                {run.title}
                <span className="text-gray-400 ml-2">{run.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
