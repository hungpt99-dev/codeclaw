import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge.js";
import { MarkdownViewer } from "../components/MarkdownViewer.js";
import { api } from "../lib/api.js";
import type { Run, Artifact } from "../lib/types.js";
import type { ReactElement } from "react";

const GROUPS = [
  { key: "requirement", title: "Requirement", prefix: "requirement/" },
  { key: "design", title: "Design", prefix: "design/" },
  { key: "tasks", title: "Tasks", prefix: "tasks/" },
  { key: "tests", title: "Tests", prefix: "tests/" },
  { key: "report", title: "Report", prefix: "report/" },
];

export function RunDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [runData, artifactsData] = await Promise.all([api.getRun(id), api.listArtifacts(id)]);
      setRun(runData);
      const withContent = await Promise.all(
        artifactsData.map((a) => api.getArtifact(id, a.id).catch(() => a)),
      );
      setArtifacts(withContent);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load run details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = (): void => {
    void load();
  };

  const handleCopy = (content: string, artifactId: string): void => {
    void navigator.clipboard.writeText(content).then((): void => {
      setCopiedId(artifactId);
      setTimeout((): void => {
        setCopiedId(null);
      }, 2000);
    });
  };

  const grouped = artifacts.reduce<Record<string, Artifact[]>>((acc, a) => {
    const group = GROUPS.find((g) => a.path.startsWith(g.prefix));
    const key = group?.key ?? "other";
    acc[key] ??= [];
    acc[key].push(a);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Run Detail</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Run Detail</h1>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-red-500">{error ?? "Run not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{run.title}</h1>
          <p className="text-gray-500 mt-1">ID: {run.id}</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <StatusBadge status={run.status} />
        <span className="text-sm text-gray-500">Mode: {run.mode}</span>
        <span className="text-sm text-gray-500">
          Created: {new Date(run.createdAt).toLocaleString()}
        </span>
      </div>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Input</h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{run.rawRequirement}</p>
      </section>

      {GROUPS.map((group) => {
        const groupArtifacts = grouped[group.key];
        return (
          <section key={group.key} className="rounded-lg border bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{group.title}</h2>
            {groupArtifacts && groupArtifacts.length > 0 ? (
              <div className="space-y-4">
                {groupArtifacts.map((a) => (
                  <div key={a.id}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-700">{a.name}</h3>
                      <button
                        type="button"
                        onClick={(): void => {
                          handleCopy(a.content ?? "", a.id);
                        }}
                        className="text-xs px-2 py-1 rounded border bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        {copiedId === a.id ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    {a.content ? (
                      <div className="rounded-md bg-gray-50 p-4">
                        <MarkdownViewer content={a.content} />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No content available</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                No {group.title.toLowerCase()} artifacts yet.
              </p>
            )}
          </section>
        );
      })}

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Logs</h2>
        <p className="text-sm text-gray-400 italic">Logs are not available yet.</p>
      </section>
    </div>
  );
}
