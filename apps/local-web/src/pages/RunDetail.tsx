import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge.js";
import { MarkdownViewer } from "../components/MarkdownViewer.js";
import { DiffViewer } from "../components/DiffViewer.js";
import { api } from "../lib/api.js";
import type {
  Run,
  Artifact,
  Approval,
  TraceabilityMatrix,
  CodeGenerationResult,
  TestRunResult,
  GitHubStatus,
  GitHubPRSummary,
  JiraStatus,
  SlackStatus,
  SlackPostResult,
  ExportOptions,
  ReviewOutput,
  ReviewArtifacts,
  FixLoopResult,
} from "../lib/types.js";
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
  { key: "scope", title: "Scope", prefix: "scope/" },
  { key: "design", title: "Design", prefix: "design/" },
  { key: "tasks", title: "Tasks", prefix: "tasks/" },
  { key: "tests", title: "Tests", prefix: "tests/" },
  { key: "ux", title: "UX / Design", prefix: "ux/" },
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
  const [traceability, setTraceability] = useState<TraceabilityMatrix | null>(null);
  const [traceabilityLoading, setTraceabilityLoading] = useState(false);
  const [traceabilityError, setTraceabilityError] = useState<string | null>(null);
  const [codeResult, setCodeResult] = useState<CodeGenerationResult | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<string | null>(null);
  const [agentLog, setAgentLog] = useState<string | null>(null);
  const [implementationPrompt, setImplementationPrompt] = useState<string | null>(null);
  const [testRunResult, setTestRunResult] = useState<TestRunResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResultContent, setTestResultContent] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewOutput | null>(null);
  const [reviewArtifacts, setReviewArtifacts] = useState<ReviewArtifacts | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [fixLoopResult, setFixLoopResult] = useState<FixLoopResult | null>(null);

  const [gitHubStatus, setGitHubStatus] = useState<GitHubStatus | null>(null);
  const [gitHubPRSummary, setGitHubPRSummary] = useState<GitHubPRSummary | null>(null);
  const [gitHubPRLoading, setGitHubPRLoading] = useState(false);
  const [gitHubPRResult, setGitHubPRResult] = useState<string | null>(null);
  const [jiraStatus, setJiraStatus] = useState<JiraStatus | null>(null);
  const [jiraMarkdown, setJiraMarkdown] = useState<string | null>(null);
  const [jiraCreateResult, setJiraCreateResult] = useState<string | null>(null);
  const [jiraLoading, setJiraLoading] = useState(false);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);
  const [slackPostResult, setSlackPostResult] = useState<SlackPostResult | null>(null);
  const [slackLoading, setSlackLoading] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<string>("html");
  const [exportIncludeLogs, setExportIncludeLogs] = useState(false);
  const [exportIncludeDiff, setExportIncludeDiff] = useState(false);
  const [exportDocTitle, setExportDocTitle] = useState("");
  const [exportDocAuthor, setExportDocAuthor] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);

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

  const loadTraceability = useCallback(async () => {
    if (!id) return;
    setTraceabilityLoading(true);
    setTraceabilityError(null);
    try {
      const data = await api.getTraceability(id);
      setTraceability(data);
    } catch {
      setTraceabilityError("No traceability data available. Generate it first.");
      setTraceability(null);
    } finally {
      setTraceabilityLoading(false);
    }
  }, [id]);

  const handleGenerateTraceability = useCallback(async () => {
    if (!id) return;
    setTraceabilityLoading(true);
    setTraceabilityError(null);
    try {
      const data = await api.generateTraceability(id);
      setTraceability(data);
    } catch {
      setTraceabilityError("Failed to generate traceability.");
      setTraceability(null);
    } finally {
      setTraceabilityLoading(false);
    }
  }, [id]);

  const handleTriggerCode = useCallback(async () => {
    if (!id) return;
    setCodeLoading(true);
    setCodeError(null);
    try {
      const agent = "claude";
      const result = await api.triggerCodeGeneration(id, agent);
      setCodeResult(result.codeGeneration);
      setFixLoopResult(result.fixLoopResult ?? null);
      if (result.codeGeneration.success) {
        const diffData = await api.getDiffPatch(id).catch(() => ({ diffContent: "" }));
        setDiffContent(diffData.diffContent);
        const logData = await api.getAgentLog(id).catch(() => ({ log: "" }));
        setAgentLog(logData.log);
      }
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : "Code generation failed");
    } finally {
      setCodeLoading(false);
    }
  }, [id]);

  const handleRunTests = useCallback(async () => {
    if (!id) return;
    setTestLoading(true);
    setTestError(null);
    try {
      const result = await api.triggerTests(id);
      setTestRunResult(result);
      const content = await api.getTestResult(id);
      setTestResultContent(content.testResult);
    } catch (e) {
      setTestError(e instanceof Error ? e.message : "Test execution failed");
    } finally {
      setTestLoading(false);
    }
  }, [id]);

  const handleRunReview = useCallback(async () => {
    if (!id) return;
    setReviewLoading(true);
    setReviewError(null);
    try {
      const result = await api.triggerReview(id);
      setReviewResult(result);
      const artifacts = await api.getReviewArtifacts(id);
      setReviewArtifacts(artifacts);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setReviewLoading(false);
    }
  }, [id]);

  const handleLoadReview = useCallback(async () => {
    if (!id) return;
    try {
      const artifacts = await api.getReviewArtifacts(id);
      setReviewArtifacts(artifacts);
    } catch {
      setReviewArtifacts(null);
    }
  }, [id]);

  const handleLoadTestResult = useCallback(async () => {
    if (!id) return;
    try {
      const content = await api.getTestResult(id);
      setTestResultContent(content.testResult);
    } catch {
      setTestResultContent(null);
    }
  }, [id]);

  const handleLoadImplementationPrompt = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getImplementationPrompt(id);
      setImplementationPrompt(data.prompt);
    } catch {
      setImplementationPrompt(null);
    }
  }, [id]);

  const handleLoadDiff = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getDiffPatch(id);
      setDiffContent(data.diffContent);
    } catch {
      setDiffContent(null);
    }
  }, [id]);

  const handleLoadAgentLog = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getAgentLog(id);
      setAgentLog(data.log);
    } catch {
      setAgentLog(null);
    }
  }, [id]);

  const handleExport = useCallback(async (): Promise<void> => {
    if (!id) return;
    setExportLoading(true);
    setExportResult(null);
    try {
      const options: ExportOptions = {
        format: exportFormat as ExportOptions["format"],
        includeLogs: exportIncludeLogs,
        includeDiff: exportIncludeDiff,
      };
      if (exportDocTitle) options.title = exportDocTitle;
      if (exportDocAuthor) options.author = exportDocAuthor;
      const result = await api.exportRun(id, options);
      if (result.success) {
        setExportResult("Export completed successfully! Check the file in the exported directory.");
      } else {
        setExportResult(`Export failed: ${result.result?.error ?? "Unknown error"}`);
      }
    } catch (e) {
      setExportResult(`Export failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setExportLoading(false);
    }
  }, [id, exportFormat, exportIncludeLogs, exportIncludeDiff, exportDocTitle, exportDocAuthor]);

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowExportModal(true);
              setExportDocTitle(run.title);
            }}
            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Export
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <StatusBadge status={run.status} />
        <span className="text-sm text-gray-500">Mode: {run.mode}</span>
        <span className="text-sm text-gray-500">
          Created: {new Date(run.createdAt).toLocaleString()}
        </span>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Artifacts</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => {
                    setExportFormat(e.target.value);
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white text-gray-700"
                >
                  <option value="html">HTML</option>
                  <option value="docx">DOCX (Word)</option>
                  <option value="pdf">PDF</option>
                  <option value="zip">ZIP Archive</option>
                  <option value="markdown">Markdown</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={exportDocTitle}
                  onChange={(e) => {
                    setExportDocTitle(e.target.value);
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white text-gray-700"
                  placeholder={run.title}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <input
                  type="text"
                  value={exportDocAuthor}
                  onChange={(e) => {
                    setExportDocAuthor(e.target.value);
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white text-gray-700"
                  placeholder="AITeam"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={exportIncludeLogs}
                    onChange={(e) => {
                      setExportIncludeLogs(e.target.checked);
                    }}
                    className="rounded border-gray-300"
                  />
                  Include Logs
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={exportIncludeDiff}
                    onChange={(e) => {
                      setExportIncludeDiff(e.target.checked);
                    }}
                    className="rounded border-gray-300"
                  />
                  Include Diff
                </label>
              </div>

              {exportResult && (
                <div
                  className={`text-sm px-3 py-2 rounded-md ${exportResult.startsWith("Export completed") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                >
                  {exportResult}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  setExportResult(null);
                }}
                className="px-4 py-2 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleExport();
                }}
                disabled={exportLoading}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {exportLoading ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>
        </div>
      )}

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

      <section className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Traceability</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void loadTraceability();
              }}
              disabled={traceabilityLoading}
              className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {traceabilityLoading ? "Loading..." : "Load"}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleGenerateTraceability();
              }}
              disabled={traceabilityLoading}
              className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {traceabilityLoading ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        {traceabilityError && !traceability && (
          <p className="text-sm text-gray-400 italic">{traceabilityError}</p>
        )}

        {traceabilityLoading && !traceability && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
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
            Loading traceability...
          </div>
        )}

        {traceability && (
          <>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="rounded-md bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{traceability.summary.total}</div>
                <div className="text-xs text-gray-500">Total Items</div>
              </div>
              <div className="rounded-md bg-green-50 p-3 text-center">
                <div className="text-2xl font-bold text-green-700">
                  {traceability.summary.covered}
                </div>
                <div className="text-xs text-green-600">Covered</div>
              </div>
              <div className="rounded-md bg-yellow-50 p-3 text-center">
                <div className="text-2xl font-bold text-yellow-700">
                  {traceability.summary.partial}
                </div>
                <div className="text-xs text-yellow-600">Partial</div>
              </div>
              <div className="rounded-md bg-red-50 p-3 text-center">
                <div className="text-2xl font-bold text-red-700">
                  {traceability.summary.notCovered}
                </div>
                <div className="text-xs text-red-600">Not Covered</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4 font-medium">Requirement</th>
                    <th className="pb-2 pr-4 font-medium">Text</th>
                    <th className="pb-2 pr-4 font-medium">AC</th>
                    <th className="pb-2 pr-4 font-medium">Tasks</th>
                    <th className="pb-2 pr-4 font-medium">Code Files</th>
                    <th className="pb-2 pr-4 font-medium">Tests</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {traceability.items.map((item) => {
                    let statusClass = "bg-gray-100 text-gray-700";
                    let statusLabel: string = item.status;
                    if (item.status === "COVERED") {
                      statusClass = "bg-green-100 text-green-700";
                      statusLabel = "Covered";
                    } else if (item.status === "PARTIAL") {
                      statusClass = "bg-yellow-100 text-yellow-700";
                      statusLabel = "Partial";
                    } else if (item.status === "NOT_COVERED") {
                      statusClass = "bg-red-100 text-red-700";
                      statusLabel = "Not Covered";
                    }
                    return (
                      <tr key={item.requirementId} className="border-b hover:bg-gray-50">
                        <td className="py-2 pr-4 font-mono text-xs">{item.requirementId}</td>
                        <td className="py-2 pr-4 text-xs max-w-xs truncate">
                          {item.requirementText}
                        </td>
                        <td className="py-2 pr-4 text-xs">
                          {item.acceptanceCriteriaIds.join(", ")}
                        </td>
                        <td className="py-2 pr-4 text-xs">{item.taskIds.join(", ")}</td>
                        <td className="py-2 pr-4 text-xs">{item.codeFiles.join(", ") || "—"}</td>
                        <td className="py-2 pr-4 text-xs">{item.testCases.join(", ") || "—"}</td>
                        <td className="py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {traceability.items.length > 0 && (
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const total = String(traceability.summary.total);
                    const covered = String(traceability.summary.covered);
                    const partial = String(traceability.summary.partial);
                    const notCovered = String(traceability.summary.notCovered);
                    const mdContent = `# Traceability Matrix\n\n## Summary\n\n| Metric | Value |\n|---|---|\n| Total | ${total} |\n| Covered | ${covered} |\n| Partial | ${partial} |\n| Not Covered | ${notCovered} |\n`;
                    void navigator.clipboard.writeText(mdContent);
                  }}
                  className="text-xs px-2 py-1 rounded border bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Copy Markdown Summary
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(JSON.stringify(traceability, null, 2));
                  }}
                  className="text-xs px-2 py-1 rounded border bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Copy JSON
                </button>
              </div>
            )}
          </>
        )}

        {!traceability && !traceabilityLoading && !traceabilityError && (
          <p className="text-sm text-gray-400 italic">
            Click "Load" to view traceability or "Generate" to create it.
          </p>
        )}
      </section>

      <section className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Implementation</h2>
          {run.mode === "semi-auto" && (
            <button
              type="button"
              onClick={() => {
                void handleTriggerCode();
              }}
              disabled={codeLoading}
              className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {codeLoading ? "Running..." : "Run Code Generation"}
            </button>
          )}
        </div>

        {codeError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 mb-3">
            <p className="text-sm text-red-700">{codeError}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Implementation Prompt</h3>
              <button
                type="button"
                onClick={() => {
                  void handleLoadImplementationPrompt();
                }}
                className="text-xs px-2 py-1 rounded border bg-white text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Load
              </button>
            </div>
            {implementationPrompt ? (
              <div className="rounded-md bg-gray-50 p-4 max-h-64 overflow-y-auto">
                <MarkdownViewer content={implementationPrompt} />
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                Click "Load" to view the implementation prompt.
              </p>
            )}
          </div>

          {codeResult && (
            <div className="rounded-md border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${codeResult.success ? "bg-green-500" : "bg-red-500"}`}
                />
                <span className="text-sm font-medium">
                  {codeResult.success ? "Code generation succeeded" : "Code generation failed"}
                </span>
              </div>

              {codeResult.fileSafety && (
                <>
                  {codeResult.fileSafety.blocked.length > 0 && (
                    <div className="rounded-md bg-red-50 border border-red-200 p-3">
                      <p className="text-sm font-medium text-red-700 mb-1">Blocked Files:</p>
                      <ul className="list-disc list-inside text-sm text-red-600">
                        {codeResult.fileSafety.blocked.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {codeResult.fileSafety.warnings.length > 0 && (
                    <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
                      <p className="text-sm font-medium text-yellow-700 mb-1">Warning Files:</p>
                      <ul className="list-disc list-inside text-sm text-yellow-600">
                        {codeResult.fileSafety.warnings.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Changed Files ({codeResult.changedFiles.length})
                  </h4>
                </div>
                {codeResult.changedFiles.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b text-left text-gray-500">
                          <th className="pb-1 pr-4 font-medium">File</th>
                          <th className="pb-1 font-medium">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {codeResult.changedFiles.map((f) => {
                          const isBlocked = codeResult.fileSafety?.blocked.includes(f);
                          const isWarned = codeResult.fileSafety?.warnings.includes(f);
                          const riskClass = isBlocked
                            ? "text-red-600"
                            : isWarned
                              ? "text-yellow-600"
                              : "text-green-600";
                          const riskLabel = isBlocked ? "Blocked" : isWarned ? "Warning" : "Safe";
                          return (
                            <tr key={f} className="border-b hover:bg-gray-50">
                              <td className="py-1 pr-4 font-mono">{f}</td>
                              <td className={`py-1 ${riskClass}`}>{riskLabel}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No files changed.</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Diff Viewer</h4>
                  <button
                    type="button"
                    onClick={() => {
                      void handleLoadDiff();
                    }}
                    className="text-xs px-2 py-1 rounded border bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    {diffContent ? "Refresh" : "Load Diff"}
                  </button>
                </div>
                {diffContent ? (
                  <div className="max-h-96 overflow-y-auto">
                    <DiffViewer diffContent={diffContent} />
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    Click "Load Diff" to view the generated patch.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Agent Output Log</h4>
                  <button
                    type="button"
                    onClick={() => {
                      void handleLoadAgentLog();
                    }}
                    className="text-xs px-2 py-1 rounded border bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    {agentLog ? "Refresh" : "Load Log"}
                  </button>
                </div>
                {agentLog ? (
                  <pre className="rounded-md bg-gray-900 text-green-400 p-4 text-xs max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {agentLog}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    Click "Load Log" to view agent output.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Test Execution</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void handleLoadTestResult();
              }}
              className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Load Results
            </button>
            <button
              type="button"
              onClick={() => {
                void handleRunTests();
              }}
              disabled={testLoading}
              className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {testLoading ? "Running..." : "Run Tests"}
            </button>
          </div>
        </div>

        {testError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 mb-3">
            <p className="text-sm text-red-700">{testError}</p>
          </div>
        )}

        {testRunResult && (
          <div className="space-y-3 mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  testRunResult.overallStatus === "PASSED" ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm font-medium">Status: {testRunResult.overallStatus}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4 font-medium">Command</th>
                    <th className="pb-2 pr-4 font-medium">Exit Code</th>
                    <th className="pb-2 pr-4 font-medium">Duration</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {testRunResult.results.map((r) => (
                    <tr key={r.name} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4 text-sm">{r.name}</td>
                      <td className="py-2 pr-4 text-sm font-mono">
                        {String(r.exitCode ?? "null")}
                      </td>
                      <td className="py-2 pr-4 text-sm">{(r.durationMs / 1000).toFixed(1)}s</td>
                      <td className="py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.status === "PASSED"
                              ? "bg-green-100 text-green-700"
                              : r.status === "TIMEOUT"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {testResultContent && (
          <div className="rounded-md bg-gray-50 p-4 max-h-64 overflow-y-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">{testResultContent}</pre>
          </div>
        )}

        {!testRunResult && !testResultContent && !testLoading && !testError && (
          <p className="text-sm text-gray-400 italic">
            Click "Run Tests" to execute configured test commands or "Load Results" to view existing
            results.
          </p>
        )}
      </section>

      <section className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Review</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void handleLoadReview();
              }}
              className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Load Review
            </button>
            <button
              type="button"
              onClick={() => {
                void handleRunReview();
              }}
              disabled={reviewLoading}
              className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {reviewLoading ? "Running..." : "Run Review"}
            </button>
          </div>
        </div>

        {reviewError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 mb-3">
            <p className="text-sm text-red-700">{reviewError}</p>
          </div>
        )}

        {reviewResult && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`inline-block w-3 h-3 rounded-full ${
                  reviewResult.overallStatus === "APPROVED"
                    ? "bg-green-500"
                    : reviewResult.overallStatus === "APPROVED_WITH_WARNINGS"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              />
              <span className="text-sm font-medium">Status: {reviewResult.overallStatus}</span>
            </div>
          </div>
        )}

        {reviewArtifacts && (
          <div className="space-y-4">
            {reviewArtifacts.requirementCoverage && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Requirement Coverage</h3>
                <div className="rounded-md bg-gray-50 p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {reviewArtifacts.requirementCoverage}
                  </pre>
                </div>
              </div>
            )}
            {reviewArtifacts.reviewReport && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Review Report</h3>
                <div className="rounded-md bg-gray-50 p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {reviewArtifacts.reviewReport}
                  </pre>
                </div>
              </div>
            )}
            {reviewArtifacts.securityReview && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Security Review</h3>
                <div className="rounded-md bg-gray-50 p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {reviewArtifacts.securityReview}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {!reviewArtifacts && !reviewLoading && !reviewError && (
          <p className="text-sm text-gray-400 italic">
            Click "Run Review" to generate a code review or "Load Review" to view existing results.
          </p>
        )}
      </section>

      {fixLoopResult && (
        <section className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Fix Loop</h2>
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                fixLoopResult.finalStatus === "PASSED"
                  ? "bg-green-100 text-green-700"
                  : fixLoopResult.finalStatus === "MAX_ITERATIONS_REACHED"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {fixLoopResult.finalStatus === "MAX_ITERATIONS_REACHED"
                ? "Max Iterations Reached"
                : fixLoopResult.finalStatus}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Total duration: {(fixLoopResult.totalDurationMs / 1000).toFixed(1)}s | Iterations:{" "}
            {fixLoopResult.iterations.length}
          </p>
          <div className="space-y-4">
            {fixLoopResult.iterations.map((iter) => (
              <div key={iter.iteration} className="rounded-md border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Iteration {iter.iteration}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${iter.passed ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <span className="text-xs text-gray-500">
                      {iter.passed ? "PASSED" : "FAILED"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Test Status:</span>{" "}
                    {iter.testResult.overallStatus}
                  </div>
                  <div>
                    <span className="font-medium">Review Status:</span>{" "}
                    {iter.reviewResult.overallStatus}
                  </div>
                </div>
                {iter.gitDiff && (
                  <div>
                    <details>
                      <summary className="text-xs font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                        View Diff
                      </summary>
                      <pre className="mt-2 rounded-md bg-gray-50 p-3 text-xs text-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {iter.gitDiff.slice(0, 2000)}
                        {iter.gitDiff.length > 2000 ? "..." : ""}
                      </pre>
                    </details>
                  </div>
                )}
                <div>
                  <details>
                    <summary className="text-xs font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                      View Fix Prompt
                    </summary>
                    <pre className="mt-2 rounded-md bg-gray-50 p-3 text-xs text-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {iter.fixPrompt.slice(0, 2000)}
                      {iter.fixPrompt.length > 2000 ? "..." : ""}
                    </pre>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
        <h2 className="text-lg font-semibold text-gray-900 mb-3">GitHub</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(): void => {
                void (async () => {
                  try {
                    const status = await api.getGitHubStatus();
                    setGitHubStatus(status);
                  } catch {
                    setGitHubStatus(null);
                  }
                })();
              }}
              className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Check GitHub Status
            </button>
            <button
              type="button"
              onClick={(): void => {
                void (async () => {
                  if (!id) return;
                  setGitHubPRLoading(true);
                  setGitHubPRResult(null);
                  try {
                    const result = await api.createGitHubPR(id);
                    if (result.summary) {
                      setGitHubPRSummary(result.summary);
                    }
                    if (result.success) {
                      setGitHubPRResult(`PR created: ${result.prUrl ?? ""}`);
                    } else if (result.gate) {
                      setGitHubPRResult(
                        "PR creation requires approval. Use --approve or approve via CLI.",
                      );
                    } else {
                      setGitHubPRResult(result.message ?? "Unknown response");
                    }
                  } catch (e) {
                    setGitHubPRResult(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
                  } finally {
                    setGitHubPRLoading(false);
                  }
                })();
              }}
              disabled={gitHubPRLoading}
              className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {gitHubPRLoading ? "Creating..." : "Create PR"}
            </button>
          </div>

          {gitHubStatus && (
            <div className="text-sm space-y-1 text-gray-700">
              <p>
                <span className="font-medium">gh CLI:</span>{" "}
                {gitHubStatus.ghCliAvailable ? "Available" : "Not found"}
              </p>
              <p>
                <span className="font-medium">Authenticated:</span>{" "}
                {gitHubStatus.ghAuthenticated ? "Yes" : "No"}
              </p>
              {gitHubStatus.currentRepo && (
                <p>
                  <span className="font-medium">Repo:</span> {gitHubStatus.currentRepo.owner}/
                  {gitHubStatus.currentRepo.repo}
                </p>
              )}
            </div>
          )}

          {gitHubPRSummary && (
            <div className="rounded-md border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">PR Summary Preview</h3>
              <p className="text-sm font-semibold text-gray-900 mb-1">{gitHubPRSummary.title}</p>
              <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-64 overflow-y-auto">
                {gitHubPRSummary.body.slice(0, 2000)}
                {gitHubPRSummary.body.length > 2000 && "..."}
              </div>
            </div>
          )}

          {gitHubPRResult && (
            <div
              className={`text-sm px-3 py-2 rounded-md ${gitHubPRResult.startsWith("PR created") ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}
            >
              {gitHubPRResult}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Jira</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(): void => {
                void (async () => {
                  try {
                    const status = await api.getJiraStatus();
                    setJiraStatus(status);
                  } catch {
                    setJiraStatus(null);
                  }
                })();
              }}
              className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Check Jira Status
            </button>
            <button
              type="button"
              onClick={(): void => {
                void (async () => {
                  if (!id) return;
                  setJiraLoading(true);
                  try {
                    const result = await api.getJiraExport(id);
                    if (result.success) {
                      setJiraMarkdown(result.markdown);
                    }
                  } catch {
                    setJiraMarkdown(null);
                  } finally {
                    setJiraLoading(false);
                  }
                })();
              }}
              disabled={jiraLoading}
              className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {jiraLoading ? "Loading..." : "Jira Export"}
            </button>
            <button
              type="button"
              onClick={(): void => {
                void (async () => {
                  if (!id) return;
                  setJiraLoading(true);
                  setJiraCreateResult(null);
                  try {
                    const result = await api.createJiraIssues(id);
                    if (result.success) {
                      setJiraCreateResult("Jira issues created successfully!");
                    } else {
                      setJiraCreateResult("Approval required. Use --approve or approve via CLI.");
                    }
                  } catch (e) {
                    setJiraCreateResult(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
                  } finally {
                    setJiraLoading(false);
                  }
                })();
              }}
              disabled={jiraLoading}
              className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {jiraLoading ? "Creating..." : "Create Jira Issues"}
            </button>
          </div>

          {jiraStatus && (
            <div className="text-sm space-y-1 text-gray-700">
              <p>
                <span className="font-medium">Enabled:</span> {jiraStatus.enabled ? "Yes" : "No"}
              </p>
              {jiraStatus.siteUrl && (
                <p>
                  <span className="font-medium">Site:</span> {jiraStatus.siteUrl}
                </p>
              )}
              {jiraStatus.projectKey && (
                <p>
                  <span className="font-medium">Project:</span> {jiraStatus.projectKey}
                </p>
              )}
              <p>
                <span className="font-medium">Token:</span>{" "}
                {jiraStatus.hasToken ? "Set" : "Not set"}
              </p>
              <p>
                <span className="font-medium">Status:</span> {jiraStatus.overall}
              </p>
            </div>
          )}

          {jiraMarkdown && (
            <div className="rounded-md border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Jira-ready Markdown</h3>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-64 overflow-y-auto bg-gray-50 p-3 rounded">
                {jiraMarkdown.slice(0, 2000)}
                {jiraMarkdown.length > 2000 && "..."}
              </pre>
              <button
                type="button"
                onClick={(): void => {
                  void navigator.clipboard.writeText(jiraMarkdown);
                }}
                className="mt-2 text-xs px-2 py-1 rounded border bg-white text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Copy Markdown
              </button>
            </div>
          )}

          {jiraCreateResult && (
            <div
              className={`text-sm px-3 py-2 rounded-md ${jiraCreateResult.startsWith("Error") ? "bg-red-50 text-red-700" : jiraCreateResult.includes("successfully") ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}
            >
              {jiraCreateResult}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Slack</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(): void => {
                void (async () => {
                  try {
                    const status = await api.getSlackStatus();
                    setSlackStatus(status);
                  } catch {
                    setSlackStatus(null);
                  }
                })();
              }}
              className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Check Slack Status
            </button>
            <button
              type="button"
              onClick={(): void => {
                void (async () => {
                  if (!id) return;
                  setSlackLoading(true);
                  setSlackPostResult(null);
                  try {
                    const result = await api.postSlackMessage(id, "report_ready");
                    setSlackPostResult(result);
                    if (result.success) {
                      setSlackPostResult(
                        result.ts ? { success: true, ts: result.ts } : { success: true },
                      );
                    } else if (result.error === "Approval required") {
                      setSlackPostResult({
                        success: false,
                        error: "Approval required. Use --approve or approve via CLI.",
                      });
                    }
                  } catch (e) {
                    setSlackPostResult({
                      success: false,
                      error: `Error: ${e instanceof Error ? e.message : "Unknown"}`,
                    });
                  } finally {
                    setSlackLoading(false);
                  }
                })();
              }}
              disabled={slackLoading}
              className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {slackLoading ? "Posting..." : "Post to Slack"}
            </button>
          </div>

          {slackStatus && (
            <div className="text-sm space-y-1 text-gray-700">
              <p>
                <span className="font-medium">Enabled:</span> {slackStatus.enabled ? "Yes" : "No"}
              </p>
              {slackStatus.channelId && (
                <p>
                  <span className="font-medium">Channel:</span> {slackStatus.channelId}
                </p>
              )}
              <p>
                <span className="font-medium">Token:</span>{" "}
                {slackStatus.hasToken ? "Set" : "Not set"}
              </p>
              <p>
                <span className="font-medium">Status:</span> {slackStatus.overall}
              </p>
            </div>
          )}

          {slackPostResult && (
            <div
              className={`text-sm px-3 py-2 rounded-md ${slackPostResult.success ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}
            >
              {slackPostResult.success
                ? `Message posted to Slack!`
                : (slackPostResult.error ?? "Unknown")}
            </div>
          )}
        </div>
      </section>

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
