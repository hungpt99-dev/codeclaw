import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useProject } from "../lib/ProjectContext.js";
import type { DoctorStatus, DoctorCheck } from "../lib/types.js";
import type { ReactElement } from "react";

function StatusIcon({ status }: { status: string }): ReactElement {
  if (status === "ok") {
    return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold">&#10003;</span>;
  }
  if (status === "warning" || status === "info") {
    return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">!</span>;
  }
  if (status === "error") {
    return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold">&#10007;</span>;
  }
  return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold">?</span>;
}

function CheckList({ checks }: { checks: DoctorCheck[] }): ReactElement {
  return (
    <div className="space-y-2">
      {checks.map((check, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <StatusIcon status={check.status} />
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-medium">{check.name}</p>
            <p className="text-gray-500">{check.message}</p>
            {check.recommendation && (
              <p className="text-amber-600 text-xs mt-0.5">{check.recommendation}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  status,
  children,
}: {
  title: string;
  status: string;
  children: React.ReactNode;
}): ReactElement {
  const borderColor =
    status === "ok" ? "border-green-200" :
    status === "warning" || status === "info" ? "border-yellow-200" :
    status === "error" ? "border-red-200" : "border-gray-200";
  const bgColor =
    status === "ok" ? "bg-green-50" :
    status === "warning" || status === "info" ? "bg-yellow-50" :
    status === "error" ? "bg-red-50" : "bg-white";

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <StatusIcon status={status} />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function Doctor(): ReactElement {
  const [status, setStatus] = useState<DoctorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeProject } = useProject();

  useEffect(() => {
    api
      .getDoctorStatus(activeProject?.id)
      .then(setStatus)
      .catch((err: unknown) => { setError(err instanceof Error ? err.message : "Failed to load doctor status"); })
      .finally(() => { setLoading(false); });
  }, [activeProject?.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor</h1>
          <p className="text-gray-500 mt-1">Checking system readiness...</p>
        </div>
        <div className="rounded-lg border bg-white p-6 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Running diagnostics...
          </div>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor</h1>
          <p className="text-gray-500 mt-1">System readiness check.</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">{error ?? "Failed to load doctor status"}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              api
                .getDoctorStatus(activeProject?.id)
                .then(setStatus)
                .catch((err: unknown) => { setError(err instanceof Error ? err.message : "Failed"); })
                .finally(() => { setLoading(false); });
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
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Doctor</h1>
        <p className="text-gray-500 mt-1">System readiness check for CodeClaw.</p>
      </div>

      {/* Overall Status */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center gap-3">
          <StatusIcon status={
            status.project.status === "ok" && status.storage.status === "ok" ? "ok" :
            status.project.status === "error" || status.storage.status === "error" ? "error" : "warning"
          } />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {activeProject
                ? `Project: ${activeProject.name}`
                : "No project selected"
              }
            </p>
            {activeProject && (
              <p className="text-xs text-gray-500 font-mono">{activeProject.rootPath}</p>
            )}
          </div>
        </div>
      </div>

      {/* Project Section */}
      <SectionCard title="Project" status={status.project.status}>
        <CheckList checks={status.project.checks} />
      </SectionCard>

      {/* Storage Section */}
      <SectionCard title="Storage" status={status.storage.status}>
        <CheckList checks={status.storage.checks} />
      </SectionCard>

      {/* Providers Section */}
      <SectionCard title="AI Provider" status={status.providers.status}>
        <CheckList checks={status.providers.checks} />
      </SectionCard>

      {/* Coding Adapters Section */}
      <SectionCard title="Coding Adapters" status={status.adapters.status}>
        <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {status.adapters.items.map((item) => (
            <div key={item.key} className="flex items-center gap-2 text-sm bg-white rounded px-3 py-2 border">
              <span className={`w-2 h-2 rounded-full ${item.available ? "bg-green-500" : "bg-red-400"}`} />
              <span className="text-gray-900">{item.name}</span>
              <span className="text-xs text-gray-400">({item.command})</span>
            </div>
          ))}
        </div>
        <CheckList checks={status.adapters.checks} />
      </SectionCard>

      {/* Native Runner Section */}
      <SectionCard title="Native Runner" status={status.nativeRunner.status}>
        <CheckList checks={status.nativeRunner.checks} />
      </SectionCard>

      {/* Security Section */}
      <SectionCard title="Security" status={status.security.status}>
        {status.security.envVarNames.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Environment variables detected (values not shown):</p>
            <div className="flex flex-wrap gap-1">
              {status.security.envVarNames.map((env) => (
                <span key={env} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">
                  {env}
                </span>
              ))}
            </div>
          </div>
        )}
        <CheckList checks={status.security.checks} />
      </SectionCard>

      {/* Recommendations */}
      {status.recommendations.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Recommendations</h3>
          <ul className="space-y-1">
            {status.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">&rarr;</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Settings Link */}
      <div className="text-sm text-gray-500">
        <Link to="/settings" className="text-blue-600 hover:text-blue-500">
          Go to Settings &rarr;
        </Link>
      </div>
    </div>
  );
}
