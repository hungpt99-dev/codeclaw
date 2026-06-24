import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api.js";
import type { ProjectEntry } from "../lib/types.js";
import type { ReactElement } from "react";

export function Projects(): ReactElement {
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addPath, setAddPath] = useState("");
  const [addName, setAddName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listProjects();
      setProjects(data.projects);
      setActiveProjectId(data.activeProjectId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const handleUse = async (id: string): Promise<void> => {
    try {
      await api.useProject(id);
      await fetchProjects();
    } catch {
      /* noop */
    }
  };

  const handleRemove = async (id: string): Promise<void> => {
    try {
      await api.removeProject(id);
      await fetchProjects();
    } catch {
      /* noop */
    }
  };

  const handleAdd = async (): Promise<void> => {
    if (!addPath.trim()) {
      setAddError("Path is required");
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      await api.addProject(addPath.trim(), addName.trim() || undefined);
      setShowAddForm(false);
      setAddPath("");
      setAddName("");
      await fetchProjects();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add project");
    } finally {
      setAddLoading(false);
    }
  };

  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage registered projects.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(true);
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Add Project
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => {
              void fetchProjects();
            }}
            className="mt-2 text-sm text-red-600 hover:text-red-500"
          >
            Retry
          </button>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Register a Project</h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Root Path *</label>
            <input
              type="text"
              value={addPath}
              onChange={(e) => {
                setAddPath(e.target.value);
              }}
              placeholder="/path/to/project"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name (optional)</label>
            <input
              type="text"
              value={addName}
              onChange={(e) => {
                setAddName(e.target.value);
              }}
              placeholder="my-project"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void handleAdd();
              }}
              disabled={addLoading}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {addLoading ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setAddError(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-lg border bg-white p-6 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
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
            Loading projects...
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && projects.length === 0 && (
        <div className="rounded-lg border bg-white p-6 text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-900">No projects registered</p>
          <p className="mt-1 text-sm text-gray-500">Add a project directory to get started.</p>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(true);
            }}
            className="inline-block mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Add Project
          </button>
        </div>
      )}

      {/* Project List */}
      {!loading && !error && projects.length > 0 && (
        <div className="space-y-3">
          {projects.map((p) => {
            const isActive = p.id === activeProjectId;
            return (
              <div
                key={p.id}
                className={`rounded-lg border bg-white p-4 ${isActive ? "ring-2 ring-blue-500" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${p.exists ? "bg-green-500" : "bg-red-500"}`}
                      />
                      <h3 className="text-sm font-semibold text-gray-900">{p.name}</h3>
                      {isActive && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{p.rootPath}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span>ID: {p.id}</span>
                      {p.lastUsedAt && (
                        <span>Last used: {new Date(p.lastUsedAt).toLocaleDateString()}</span>
                      )}
                      <span className={p.exists ? "text-green-600" : "text-red-600"}>
                        {p.exists ? "Directory exists" : "Directory missing"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          void handleUse(p.id);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                      >
                        Use
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove "${p.name}" from registry? Project files will not be deleted.`,
                          )
                        ) {
                          void handleRemove(p.id);
                        }
                      }}
                      className="text-sm text-red-500 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeProject && (
        <div className="rounded-lg border bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <strong>Active project:</strong> {activeProject.name} — All runs, artifacts, and
            workflows are scoped to this project.
          </p>
        </div>
      )}
    </div>
  );
}
