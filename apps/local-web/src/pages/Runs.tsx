import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge.js";
import { api } from "../lib/api.js";
import type { Run } from "../lib/types.js";
import type { ReactElement } from "react";

export function Runs(): ReactElement {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Runs</h1>
        <p className="text-gray-500 mt-1">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Runs</h1>
        <p className="text-gray-500 mt-1">All execution runs ordered by creation date.</p>
      </div>
      {runs.length === 0 ? (
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">No runs yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                    <Link to={`/runs/${run.id}`} className="text-blue-600 hover:underline">
                      {run.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{run.title}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(run.createdAt).toLocaleString()}
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
