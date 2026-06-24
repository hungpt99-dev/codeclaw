import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import type {
  AiCliToolInfo,
  AiCliTestResult,
  StorageInfo,
  StorageCleanResult,
  DocArtifactType,
} from "../lib/types.js";
import { DOC_ARTIFACT_LABELS } from "../lib/types.js";
import type { ReactElement } from "react";

/* ─── Application Settings ─── */

interface SettingsForm {
  project_name: string;
  project_type: string;
  default_output_language: string;
  build_command: string;
  unit_test_command: string;
  integration_test_command: string;
  lint_command: string;
  max_iterations: string;
  command_timeout: string;
}

const FIELD_LABELS: Record<keyof SettingsForm, string> = {
  project_name: "Project Name",
  project_type: "Project Type",
  default_output_language: "Default Output Language",
  build_command: "Build Command",
  unit_test_command: "Unit Test Command",
  integration_test_command: "Integration Test Command",
  lint_command: "Lint Command",
  max_iterations: "Max Iterations",
  command_timeout: "Command Timeout (seconds)",
};

const FIELD_PLACEHOLDERS: Record<keyof SettingsForm, string> = {
  project_name: "My Project",
  project_type: "web, mobile, library, etc.",
  default_output_language: "English",
  build_command: "npm run build",
  unit_test_command: "npm test",
  integration_test_command: "npm run test:integration",
  lint_command: "npm run lint",
  max_iterations: "3",
  command_timeout: "900",
};

const REQUIRED_FIELDS: (keyof SettingsForm)[] = ["project_name", "project_type"];

const EMPTY_FORM: SettingsForm = {
  project_name: "",
  project_type: "",
  default_output_language: "",
  build_command: "",
  unit_test_command: "",
  integration_test_command: "",
  lint_command: "",
  max_iterations: "",
  command_timeout: "",
};

function validate(form: SettingsForm): string | null {
  for (const field of REQUIRED_FIELDS) {
    if (!form[field].trim()) {
      return `${FIELD_LABELS[field]} is required`;
    }
  }
  if (form.max_iterations) {
    const n = Number(form.max_iterations);
    if (!Number.isInteger(n) || n < 1) {
      return "Max iterations must be a positive integer";
    }
  }
  if (form.command_timeout) {
    const n = Number(form.command_timeout);
    if (!Number.isInteger(n) || n < 1) {
      return "Command timeout must be a positive integer";
    }
  }
  return null;
}

/* ─── Agent Roles ─── */

const AGENT_ROLES = [
  "BA",
  "Product Owner",
  "PM",
  "Architect",
  "Developer",
  "QA",
  "Reviewer",
  "Security Reviewer",
  "Reporter",
] as const;

const AI_TOOL_OPTIONS = [
  { value: "claude", label: "Claude Code" },
  { value: "codex", label: "Codex CLI" },
  { value: "gemini", label: "Gemini CLI" },
  { value: "aider", label: "Aider" },
  { value: "disabled", label: "Disabled" },
];

/* ─── Doc Artifacts ─── */

const ALL_DOC_ARTIFACTS: DocArtifactType[] = [
  "clarified_requirement",
  "business_rules",
  "acceptance_criteria",
  "open_questions",
  "scope_definition",
  "technical_design",
  "api_design",
  "database_design",
  "task_breakdown",
  "test_matrix",
  "implementation_prompt",
  "review_report",
  "security_review",
  "traceability_matrix",
  "final_report",
];

/* ─── Main Component ─── */

export function Settings(): ReactElement {
  /* App settings */
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /* AI CLI */
  const [aiTools, setAiTools] = useState<AiCliToolInfo[]>([]);
  const [aiToolsLoading, setAiToolsLoading] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<AiCliTestResult | null>(null);
  const [aiTestingTool, setAiTestingTool] = useState<string | null>(null);

  /* Agent Mapping */
  const [agentMapping, setAgentMapping] = useState<Record<string, string>>({});

  /* Safety */
  const [safetyRequireCode, setSafetyRequireCode] = useState(true);
  const [safetyRequireExternal, setSafetyRequireExternal] = useState(true);
  const [safetyRequireRollback, setSafetyRequireRollback] = useState(true);
  const [safetyTimeout, setSafetyTimeout] = useState("900");
  const [safetyMaxFixIterations, setSafetyMaxFixIterations] = useState("3");
  const [safetyProtectedPatterns, setSafetyProtectedPatterns] = useState("");
  const [safetyWarningPatterns, setSafetyWarningPatterns] = useState("");
  const [safetyBlockedCommands, setSafetyBlockedCommands] = useState("");

  /* Documentation */
  const [docArtifacts, setDocArtifacts] = useState<Record<string, boolean>>({});
  const [docFormat, setDocFormat] = useState<"markdown" | "json">("markdown");

  /* Storage */
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageCleanResult, setStorageCleanResult] = useState<StorageCleanResult | null>(null);
  const [storageCleaning, setStorageCleaning] = useState(false);

  /* ─── Load ─── */

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listSettings();
      const map: Record<string, string> = {};
      for (const s of data) {
        map[s.key] = s.value;
      }
      setForm({
        project_name: map.project_name ?? "",
        project_type: map.project_type ?? "",
        default_output_language: map.default_output_language ?? "",
        build_command: map.build_command ?? "",
        unit_test_command: map.unit_test_command ?? "",
        integration_test_command: map.integration_test_command ?? "",
        lint_command: map.lint_command ?? "",
        max_iterations: map.max_iterations ?? "",
        command_timeout: map.command_timeout ?? "",
      });

      /* Agent mapping */
      if (map.agent_mapping) {
        try {
          setAgentMapping(JSON.parse(map.agent_mapping) as Record<string, string>);
        } catch {
          /* ignore */
        }
      }

      /* Safety */
      if (map.safety_settings) {
        try {
          const s = JSON.parse(map.safety_settings) as Record<string, unknown>;
          if (typeof s.requireApprovalBeforeCode === "boolean")
            setSafetyRequireCode(s.requireApprovalBeforeCode);
          if (typeof s.requireApprovalBeforeExternalUpdate === "boolean")
            setSafetyRequireExternal(s.requireApprovalBeforeExternalUpdate);
          if (typeof s.requireApprovalBeforeRollback === "boolean")
            setSafetyRequireRollback(s.requireApprovalBeforeRollback);
          if (typeof s.commandTimeout === "string") setSafetyTimeout(s.commandTimeout);
          if (typeof s.maxFixIterations === "string") setSafetyMaxFixIterations(s.maxFixIterations);
          if (typeof s.protectedFilePatterns === "string")
            setSafetyProtectedPatterns(s.protectedFilePatterns);
          if (typeof s.warningFilePatterns === "string")
            setSafetyWarningPatterns(s.warningFilePatterns);
          if (typeof s.blockedCommands === "string") setSafetyBlockedCommands(s.blockedCommands);
        } catch {
          /* ignore */
        }
      }

      /* Documentation */
      if (map.doc_settings) {
        try {
          const d = JSON.parse(map.doc_settings) as Record<string, unknown>;
          if (d.artifacts && typeof d.artifacts === "object") {
            setDocArtifacts(d.artifacts as Record<string, boolean>);
          }
          if (d.format === "markdown" || d.format === "json") {
            setDocFormat(d.format);
          }
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAiCliStatus = useCallback(async () => {
    setAiToolsLoading(true);
    try {
      const result = await api.getAiCliStatus();
      setAiTools(result.tools);
    } catch {
      /* ignore */
    } finally {
      setAiToolsLoading(false);
    }
  }, []);

  const loadStorageInfo = useCallback(async () => {
    setStorageLoading(true);
    try {
      const info = await api.getStorageInfo();
      setStorageInfo(info);
    } catch {
      /* ignore */
    } finally {
      setStorageLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    void loadAiCliStatus();
    void loadStorageInfo();
  }, [loadSettings, loadAiCliStatus, loadStorageInfo]);

  const handleChange = (key: keyof SettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
    setError(null);
  };

  /* ─── Save ─── */

  const handleSave = async () => {
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload: Record<string, string> = {};
      for (const [key, value] of Object.entries(form)) {
        payload[key] = String(value);
      }

      /* Agent mapping */
      payload.agent_mapping = JSON.stringify(agentMapping);

      /* Safety */
      payload.safety_settings = JSON.stringify({
        requireApprovalBeforeCode: safetyRequireCode,
        requireApprovalBeforeExternalUpdate: safetyRequireExternal,
        requireApprovalBeforeRollback: safetyRequireRollback,
        commandTimeout: safetyTimeout,
        maxFixIterations: safetyMaxFixIterations,
        protectedFilePatterns: safetyProtectedPatterns,
        warningFilePatterns: safetyWarningPatterns,
        blockedCommands: safetyBlockedCommands,
      });

      /* Documentation */
      payload.doc_settings = JSON.stringify({
        artifacts: docArtifacts,
        format: docFormat,
      });

      await api.updateSettings(payload);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const testAiTool = async (toolKey: string) => {
    setAiTestingTool(toolKey);
    setAiTestResult(null);
    try {
      const result = await api.testAiCli(toolKey);
      setAiTestResult(result);
    } catch (e) {
      setAiTestResult({
        success: false,
        message: `Error: ${e instanceof Error ? e.message : "Unknown"}`,
      });
    } finally {
      setAiTestingTool(null);
    }
  };

  const handleCleanOldRuns = async () => {
    setStorageCleaning(true);
    setStorageCleanResult(null);
    try {
      const result = await api.cleanOldRuns(30);
      setStorageCleanResult(result);
      void loadStorageInfo();
    } catch (e) {
      setStorageCleanResult({
        success: false,
        message: `Error: ${e instanceof Error ? e.message : "Unknown"}`,
        freedBytes: 0,
      });
    } finally {
      setStorageCleaning(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${String(Number.parseFloat((bytes / k ** i).toFixed(1)))} ${sizes[i] ?? ""}`;
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure the application.</p>
        </div>
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
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure the application.</p>
      </div>

      {/* ─── Application Settings ─── */}
      <Section title="Application Settings" onReload={() => void loadSettings()}>
        {(Object.keys(FIELD_LABELS) as (keyof SettingsForm)[]).map((key) => (
          <div key={key}>
            <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
              {FIELD_LABELS[key]}
              {REQUIRED_FIELDS.includes(key) && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <input
              id={key}
              type="text"
              value={form[key]}
              onChange={(e) => {
                handleChange(key, e.target.value);
              }}
              placeholder={FIELD_PLACEHOLDERS[key]}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ))}
      </Section>

      {/* ─── AI CLI Tools ─── */}
      <Section title="AI CLI Tools" onReload={() => void loadAiCliStatus()}>
        <p className="text-sm text-gray-500 mb-3">
          Per-tool configuration. Enable/disable tools and test availability.
        </p>
        {aiToolsLoading && <p className="text-sm text-gray-400">Checking tool status...</p>}
        <div className="space-y-3">
          {aiTools.map((tool) => (
            <div key={tool.key} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{tool.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      tool.status === "available"
                        ? "bg-green-100 text-green-700"
                        : tool.status === "missing"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {tool.status === "available"
                      ? "Available"
                      : tool.status === "missing"
                        ? "Missing"
                        : "Disabled"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Command: {tool.command}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void testAiTool(tool.key)}
                  disabled={aiTestingTool === tool.key}
                  className="px-2.5 py-1 text-xs rounded-md border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {aiTestingTool === tool.key ? "Testing..." : "Test"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {aiTestResult && (
          <div
            className={`text-sm px-3 py-2 rounded-md mt-2 ${aiTestResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
          >
            {aiTestResult.message}
          </div>
        )}
      </Section>

      {/* ─── Agent Role Mapping ─── */}
      <Section title="Agent Role Mapping">
        <p className="text-sm text-gray-500 mb-3">Assign AI CLI tools to agent roles.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-medium text-gray-700">Role</th>
                <th className="py-2 font-medium text-gray-700">AI CLI Tool</th>
              </tr>
            </thead>
            <tbody>
              {AGENT_ROLES.map((role) => (
                <tr key={role} className="border-b last:border-b-0">
                  <td className="py-2 pr-4 text-gray-900">{role}</td>
                  <td className="py-2">
                    <select
                      value={agentMapping[role] ?? "claude"}
                      onChange={(e) => {
                        setAgentMapping((prev) => ({ ...prev, [role]: e.target.value }));
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {AI_TOOL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {agentMapping[role] &&
                      agentMapping[role] !== "disabled" &&
                      (() => {
                        const mappedTool = aiTools.find((t) => t.key === agentMapping[role]);
                        if (mappedTool?.status === "missing") {
                          return (
                            <span className="ml-2 text-xs text-amber-600">Tool not available</span>
                          );
                        }
                        return null;
                      })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ─── Safety Settings ─── */}
      <Section title="Safety">
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 mb-4">
          <p className="text-sm text-amber-700">
            <strong>Safety Notice:</strong> These settings control critical safety boundaries for
            code generation and external actions. Review carefully before making changes.
          </p>
        </div>
        <div className="space-y-4">
          <ToggleRow
            label="Require approval before code generation"
            checked={safetyRequireCode}
            onChange={setSafetyRequireCode}
          />
          <ToggleRow
            label="Require approval before external update"
            checked={safetyRequireExternal}
            onChange={setSafetyRequireExternal}
          />
          <ToggleRow
            label="Require approval before rollback"
            checked={safetyRequireRollback}
            onChange={setSafetyRequireRollback}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Command timeout (seconds)
              </label>
              <input
                type="number"
                value={safetyTimeout}
                onChange={(e) => {
                  setSafetyTimeout(e.target.value);
                }}
                min={1}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max fix iterations
              </label>
              <input
                type="number"
                value={safetyMaxFixIterations}
                onChange={(e) => {
                  setSafetyMaxFixIterations(e.target.value);
                }}
                min={1}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <TextareaField
            label="Protected file patterns (one per line)"
            value={safetyProtectedPatterns}
            onChange={setSafetyProtectedPatterns}
            placeholder={`.env\n.env.*\n*.pem\n*.key\ncredentials.json`}
          />
          <TextareaField
            label="Warning file patterns (one per line)"
            value={safetyWarningPatterns}
            onChange={setSafetyWarningPatterns}
            placeholder={`pom.xml\nbuild.gradle\npackage.json\nDockerfile`}
          />
          <TextareaField
            label="Blocked commands (one per line)"
            value={safetyBlockedCommands}
            onChange={setSafetyBlockedCommands}
            placeholder={`rm -rf /\nsudo\nchmod 777\ncurl | sh`}
          />
        </div>
      </Section>

      {/* ─── Documentation Settings ─── */}
      <Section title="Documentation">
        <p className="text-sm text-gray-500 mb-3">
          Select which documentation artifact types to generate.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {ALL_DOC_ARTIFACTS.map((artifact) => (
            <label
              key={artifact}
              className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={docArtifacts[artifact] ?? true}
                onChange={(e) => {
                  setDocArtifacts((prev) => ({ ...prev, [artifact]: e.target.checked }));
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {DOC_ARTIFACT_LABELS[artifact]}
            </label>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Output Format</label>
          <select
            value={docFormat}
            onChange={(e) => {
              setDocFormat(e.target.value as "markdown" | "json");
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
          </select>
        </div>
      </Section>

      {/* ─── Storage Settings ─── */}
      <Section title="Storage" onReload={() => void loadStorageInfo()}>
        <p className="text-sm text-gray-500 mb-3">Storage paths and usage information.</p>
        {storageLoading ? (
          <p className="text-sm text-gray-400">Loading storage info...</p>
        ) : storageInfo ? (
          <>
            <div className="space-y-2 mb-4 text-sm">
              <StorageRow label=".codeclaw path" value={storageInfo.aiTeamPath} />
              <StorageRow label="Database path" value={storageInfo.databasePath} />
              <StorageRow label="Runs path" value={storageInfo.runsPath} />
              <StorageRow label="Prompts path" value={storageInfo.promptsPath} />
              <StorageRow label="Logs path" value={storageInfo.logsPath} />
              <StorageRow label="Total runs" value={String(storageInfo.totalRuns)} />
              <StorageRow label="Total size" value={formatBytes(storageInfo.totalSizeBytes)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(storageInfo.aiTeamPath).catch(() => undefined);
                  alert(`Path copied to clipboard:\n${storageInfo.aiTeamPath}`);
                }}
                className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Copy .codeclaw Path
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(storageInfo.runsPath).catch(() => undefined);
                  alert(`Path copied to clipboard:\n${storageInfo.runsPath}`);
                }}
                className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Copy Runs Path
              </button>
              <button
                type="button"
                onClick={() => void handleCleanOldRuns()}
                disabled={storageCleaning}
                className="px-3 py-1.5 text-sm rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {storageCleaning ? "Cleaning..." : "Clean Old Runs"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">Unable to load storage information.</p>
        )}
        {storageCleanResult && (
          <div
            className={`text-sm px-3 py-2 rounded-md mt-2 ${storageCleanResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
          >
            {storageCleanResult.message}{" "}
            {storageCleanResult.freedBytes > 0 &&
              `(${formatBytes(storageCleanResult.freedBytes)} freed)`}
          </div>
        )}
      </Section>

      {/* ─── Error / Success ─── */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <p className="text-sm text-green-700">Settings saved successfully.</p>
        </div>
      )}

      {/* ─── Save Button ─── */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function Section({
  title,
  children,
  onReload,
}: {
  title: string;
  children: React.ReactNode;
  onReload?: () => void;
}): ReactElement {
  return (
    <div className="rounded-lg border bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {onReload && (
          <button
            type="button"
            onClick={onReload}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Reload
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): ReactElement {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => {
          onChange(!checked);
        }}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? "bg-blue-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
        />
      </button>
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}): ReactElement {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
      />
    </div>
  );
}

function StorageRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-mono text-xs truncate ml-4 max-w-xs">{value}</span>
    </div>
  );
}
