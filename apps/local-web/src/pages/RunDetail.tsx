import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge.js";
import { MarkdownViewer } from "../components/MarkdownViewer.js";
import { api } from "../lib/api.js";
import type { Run, Artifact, Approval } from "../lib/types.js";
import type { ReactElement } from "react";

const AGENT_FORMATS = [
  { value: "generic", label: "Generic" },
  { value: "claude-code", label: "Claude Code" },
  { value: "codex", label: "Codex CLI" },
  { value: "gemini", label: "Gemini CLI" },
  { value: "aider", label: "Aider" },
] as const;

const GROUPS = [
  { key: "requirement", title: "Requirement", prefix: "requirement/" },
  { key: "design", title: "Design", prefix: "design/" },
  { key: "tasks", title: "Tasks", prefix: "tasks/" },
  { key: "tests", title: "Tests", prefix: "tests/" },
  { key: "implementation", title: "Implementation", prefix: "implementation/" },
  { key: "report", title: "Report", prefix: "report/" },
];

interface RepoAnalysisData {
  projectType: string | null;
  language: string | null;
  framework: string | null;
  buildTool: string | null;
  testFramework: string | null;
  migrationTool: string | null;
  sourceDirs: string[];
  testDirs: string[];
  configFiles: string[];
  detectedPatterns: string[];
}

export function RunDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [agentFormat, setAgentFormat] = useState("generic");
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [approvalNote, setApprovalNote] = useState("");
  const [approvalAction, setApprovalAction] = useState<string | null>(null);
  const [repoAnalysis, setRepoAnalysis] = useState<RepoAnalysisData | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [runData, artifactsData, approvalsData] = await Promise.all([
        api.getRun(id),
        api.listArtifacts(id),
        api.listApprovals(id).catch(() => [] as Approval[]),
      ]);
      setRun(runData);
      const withContent = await Promise.all(
        artifactsData.map((a) => api.getArtifact(id, a.id).catch(() => a)),
      );
      setArtifacts(withContent);
      setApprovals(approvalsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load run details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleAnalyze = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.analyzeRun(id);
      setRepoAnalysis(data.analysis as RepoAnalysisData);
    } catch {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (gate: string): Promise<void> => {
    if (!id) return;
    setApprovalAction(gate);
    try {
      await api.updateApproval(id, gate, "APPROVED", approvalNote || undefined);
      setApprovalNote("");
      await load();
    } catch {
      // ignore
    } finally {
      setApprovalAction(null);
    }
  };

  const handleReject = async (gate: string): Promise<void> => {
    if (!id) return;
    setApprovalAction(gate);
    try {
      await api.updateApproval(id, gate, "REJECTED", approvalNote || undefined);
      setApprovalNote("");
      await load();
    } catch {
      // ignore
    } finally {
      setApprovalAction(null);
    }
  };

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
          Loading run details...
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Run Detail</h1>
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
            <p className="text-sm text-red-700">{error ?? "Run not found."}</p>
          </div>
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

      {approvals.filter((a) => a.status === "PENDING").length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-3">Approval Required</h2>
          <div className="space-y-4">
            {approvals
              .filter((a) => a.status === "PENDING")
              .map((a) => (
                <div key={a.id} className="rounded-md border border-amber-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-amber-800">Gate: {a.gate}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      PENDING
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    This workflow stage is waiting for your approval.
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Note (optional)"
                      value={approvalNote}
                      onChange={(e) => {
                        setApprovalNote(e.target.value);
                      }}
                      className="flex-1 text-sm rounded border border-gray-300 px-3 py-1.5 bg-white text-gray-700"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleApprove(a.gate);
                      }}
                      disabled={approvalAction === a.gate}
                      className="px-4 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {approvalAction === a.gate ? "Processing..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleReject(a.gate);
                      }}
                      disabled={approvalAction === a.gate}
                      className="px-4 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {approvalAction === a.gate ? "Processing..." : "Reject"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Repository Analysis</h2>
          <button
            type="button"
            onClick={() => {
              void handleAnalyze();
            }}
            className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Analyze
          </button>
        </div>
        {repoAnalysis ? (
          <div className="space-y-2 text-sm text-gray-700">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium">Project Type:</span>{" "}
                {repoAnalysis.projectType ?? "Unknown"}
              </div>
              <div>
                <span className="font-medium">Language:</span> {repoAnalysis.language ?? "Unknown"}
              </div>
              <div>
                <span className="font-medium">Framework:</span>{" "}
                {repoAnalysis.framework ?? "Unknown"}
              </div>
              <div>
                <span className="font-medium">Build Tool:</span>{" "}
                {repoAnalysis.buildTool ?? "Unknown"}
              </div>
              <div>
                <span className="font-medium">Test Framework:</span>{" "}
                {repoAnalysis.testFramework ?? "Unknown"}
              </div>
              <div>
                <span className="font-medium">Migration Tool:</span>{" "}
                {repoAnalysis.migrationTool ?? "Not detected"}
              </div>
            </div>
            {repoAnalysis.sourceDirs.length > 0 && (
              <div>
                <span className="font-medium">Source Dirs:</span>{" "}
                {repoAnalysis.sourceDirs.join(", ")}
              </div>
            )}
            {repoAnalysis.testDirs.length > 0 && (
              <div>
                <span className="font-medium">Test Dirs:</span> {repoAnalysis.testDirs.join(", ")}
              </div>
            )}
            {repoAnalysis.detectedPatterns.length > 0 && (
              <div>
                <span className="font-medium">Patterns:</span>{" "}
                {repoAnalysis.detectedPatterns.join(", ")}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Click "Analyze" to detect project context.</p>
        )}
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Input</h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{run.rawRequirement}</p>
      </section>

      {GROUPS.map((group) => {
        const groupArtifacts = grouped[group.key];
        const isImplementation = group.key === "implementation";
        return (
          <section key={group.key} className="rounded-lg border bg-white p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">{group.title}</h2>
              {isImplementation && groupArtifacts && groupArtifacts.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Format:</span>
                  <select
                    value={agentFormat}
                    onChange={(e) => {
                      setAgentFormat(e.target.value);
                    }}
                    className="text-xs rounded border border-gray-300 px-2 py-1 bg-white text-gray-700"
                  >
                    {AGENT_FORMATS.map((fmt) => (
                      <option key={fmt.value} value={fmt.value}>
                        {fmt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {groupArtifacts && groupArtifacts.length > 0 ? (
              <div className="space-y-4">
                {groupArtifacts.map((a) => (
                  <div key={a.id}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-700">
                        {a.name.replace(/\.(md|json)$/, "")}
                      </h3>
                      <div className="flex items-center gap-2">
                        {isImplementation && (
                          <span className="text-xs text-gray-400">Agent: {agentFormat}</span>
                        )}
                        <button
                          type="button"
                          onClick={(): void => {
                            handleCopy(a.content ?? "", a.id);
                          }}
                          className="text-xs px-2 py-1 rounded border bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          {copiedId === a.id ? "Copied!" : "Copy to Clipboard"}
                        </button>
                      </div>
                    </div>
                    {a.content ? (
                      <div className="rounded-md bg-gray-50 p-4">
                        <MarkdownViewer content={a.content} />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No content available.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                No {group.title.toLowerCase()} artifacts yet. Run an assisted workflow to generate
                an implementation prompt.
              </p>
            )}
          </section>
        );
      })}

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Logs</h2>
        <div className="flex items-center gap-2 text-sm text-gray-400 italic">
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Logs are not available yet.
        </div>
      </section>
    </div>
  );
}
