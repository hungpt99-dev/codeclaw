import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import type { PromptFile, PromptDetail } from "../lib/types.js";
import type { ReactElement } from "react";

export function PromptTemplates(): ReactElement {
  const [prompts, setPrompts] = useState<PromptFile[]>([]);
  const [selected, setSelected] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listPrompts()
      .then(setPrompts)
      .catch(() => undefined)
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSelect = async (name: string): Promise<void> => {
    setEditing(false);
    setSaveError(null);
    try {
      const detail = await api.getPrompt(name);
      setSelected(detail);
    } catch {
      setSelected(null);
    }
  };

  const handleEdit = (): void => {
    if (!selected) return;
    setDraftContent(selected.content);
    setEditing(true);
    setSaveError(null);
  };

  const handleCancel = (): void => {
    setEditing(false);
    setDraftContent("");
    setSaveError(null);
  };

  const handleSave = async (): Promise<void> => {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.updatePrompt(selected.name, draftContent);
      setSelected({ ...selected, content: draftContent });
      setEditing(false);
      setDraftContent("");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Prompt Templates</h1>
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
          Loading prompt templates...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Prompt Templates</h1>
        <p className="text-gray-500 mt-1">
          Reusable prompt templates for common development tasks.
        </p>
      </div>
      {prompts.length === 0 ? (
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">No prompt templates found.</p>
        </div>
      ) : (
        <div className="flex gap-6">
          <nav className="w-56 shrink-0 space-y-1">
            {prompts.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  void handleSelect(p.name);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selected?.name === p.name
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p.name.replace(/\.md$/, "")}
              </button>
            ))}
          </nav>
          <div className="flex-1 rounded-lg border bg-white p-6">
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700">
                    {selected.name.replace(/\.md$/, "")}
                  </h2>
                  {!editing && (
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="rounded px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {editing ? (
                  <textarea
                    rows={20}
                    value={draftContent}
                    onChange={(e) => {
                      setDraftContent(e.target.value);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                    {selected.content}
                  </pre>
                )}
                {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                {editing && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleSave();
                      }}
                      disabled={saving}
                      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a template to view its content.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
