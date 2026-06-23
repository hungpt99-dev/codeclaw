import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import type { PromptFile, PromptDetail } from "../lib/types.js";
import type { ReactElement } from "react";

export function PromptTemplates(): ReactElement {
  const [prompts, setPrompts] = useState<PromptFile[]>([]);
  const [selected, setSelected] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(true);

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
    try {
      const detail = await api.getPrompt(name);
      setSelected(detail);
    } catch {
      setSelected(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Prompt Templates</h1>
        <p className="text-gray-500">Loading...</p>
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
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                  {selected.content}
                </pre>
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
