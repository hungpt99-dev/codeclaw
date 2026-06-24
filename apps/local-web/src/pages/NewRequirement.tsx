import { useState, type ReactElement, type SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

const OUTPUT_LANGUAGES = ["English", "Vietnamese", "Bilingual"] as const;

export function NewRequirement(): ReactElement {
  const [rawRequirement, setRawRequirement] = useState("");
  const [outputLanguage, setOutputLanguage] = useState<string>("English");
  const [mode, setMode] = useState("docs-only");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!rawRequirement.trim()) {
      setError("Requirement is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const run = await api.createRun({
        requirement: rawRequirement.trim(),
        outputLanguage,
        mode,
      });
      void navigate(`/runs/${run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create requirement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Requirement</h1>
        <p className="text-gray-500 mt-1">
          Describe a new feature or task for the AI team to implement.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="requirement" className="block text-sm font-medium text-gray-700 mb-1">
            Requirement
          </label>
          <textarea
            id="requirement"
            rows={8}
            value={rawRequirement}
            onChange={(e) => {
              setRawRequirement(e.target.value);
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Describe what needs to be built..."
          />
        </div>
        <div>
          <label htmlFor="outputLanguage" className="block text-sm font-medium text-gray-700 mb-1">
            Output Language
          </label>
          <select
            id="outputLanguage"
            value={outputLanguage}
            onChange={(e) => {
              setOutputLanguage(e.target.value);
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {OUTPUT_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="mode" className="block text-sm font-medium text-gray-700 mb-1">
            Mode
          </label>
          <select
            id="mode"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="docs-only">Docs-only</option>
            <option value="assisted">Assisted</option>
          </select>
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {submitting && (
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
          )}
          {submitting ? "Starting..." : "Start Workflow"}
        </button>
      </form>
    </div>
  );
}
