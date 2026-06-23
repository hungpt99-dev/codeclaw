import { useState, type ReactElement, type SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export function NewRequirement(): ReactElement {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const run = await api.createRun(description || title);
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
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Add user authentication"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            rows={8}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Describe what needs to be built..."
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Requirement"}
        </button>
      </form>
    </div>
  );
}
