import { useCallback, useEffect, useState, type ReactElement } from "react";
import { api } from "../lib/api.js";

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

export function Settings(): ReactElement {
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleChange = (key: keyof SettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
    setError(null);
  };

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
      await api.updateSettings(payload);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure the application.</p>
        </div>
        <p className="text-sm text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure the application.</p>
      </div>
      <div className="rounded-lg border bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Application Settings</h2>
          <button
            type="button"
            onClick={() => {
              void loadSettings();
            }}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
          >
            Reload Settings
          </button>
        </div>
        <div className="space-y-4">
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
        </div>
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
        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
