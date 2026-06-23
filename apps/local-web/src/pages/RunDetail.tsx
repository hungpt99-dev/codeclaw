import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge.js";
import { MarkdownViewer } from "../components/MarkdownViewer.js";
import { api } from "../lib/api.js";
import type { Run, Artifact } from "../lib/types.js";
import type { ReactElement } from "react";

export function RunDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async (): Promise<void> => {
      try {
        const [runData, artifactsData] = await Promise.all([api.getRun(id), api.listArtifacts(id)]);
        setRun(runData);
        setArtifacts(artifactsData);
        const first = artifactsData[0];
        if (first) {
          const a = await api.getArtifact(id, first.id);
          setSelectedArtifact(a);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const handleSelectArtifact = async (artifact: Artifact): Promise<void> => {
    setSelectedArtifact(artifact);
    if (!id || artifact.content) return;
    try {
      const detailed = await api.getArtifact(id, artifact.id);
      setSelectedArtifact(detailed);
    } catch {
      /* ignore */
    }
  };

  if (loading || !run) {
    return (
      <div className="max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Run Detail</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{run.title}</h1>
        <p className="text-gray-500 mt-1">ID: {run.id}</p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={run.status} />
        <span className="text-sm text-gray-500">
          Created: {new Date(run.createdAt).toLocaleString()}
        </span>
      </div>
      {artifacts.length > 0 ? (
        <div className="flex gap-6">
          <nav className="w-48 shrink-0 space-y-1">
            {artifacts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  void handleSelectArtifact(a);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedArtifact?.id === a.id
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {a.name}
              </button>
            ))}
          </nav>
          <div className="flex-1 rounded-lg border bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedArtifact?.name ?? "Artifact"}
            </h2>
            {selectedArtifact?.content ? (
              <MarkdownViewer content={selectedArtifact.content} />
            ) : (
              <p className="text-sm text-gray-500">Loading...</p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Requirement</h2>
          <p className="text-sm text-gray-500 mt-2">{run.rawRequirement}</p>
        </div>
      )}
    </div>
  );
}
