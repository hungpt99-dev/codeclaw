import { useState, type ReactElement, type SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

const OUTPUT_LANGUAGES = ["English", "Vietnamese", "Bilingual"] as const;

export function NewRequirement(): ReactElement {
  const [rawRequirement, setRawRequirement] = useState("");
  const [outputLanguage, setOutputLanguage] = useState<string>("English");
  const [mode] = useState("docs-only");
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
        rawRequirement: rawRequirement.trim(),
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
            disabled
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="docs-only">Docs-only</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {submitting ? "Starting..." : "Start Workflow"}
        </button>
      </form>
    </div>
  );
}
