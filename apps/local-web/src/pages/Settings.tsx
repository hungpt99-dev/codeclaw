import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import type { Setting } from "../lib/types.js";
import type { ReactElement } from "react";

export function Settings(): ReactElement {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listSettings()
      .then(setSettings)
      .catch(() => undefined)
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure the local web application.</p>
      </div>
      <div className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">API Connection</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
          <input
            type="text"
            defaultValue="http://localhost:4317/api"
            readOnly
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
          />
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Loading settings...</p>
      ) : settings.length > 0 ? (
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Application Settings</h2>
          <div className="space-y-3">
            {settings.map((s) => (
              <div key={s.key} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{s.key}</span>
                <span className="text-sm text-gray-500">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
