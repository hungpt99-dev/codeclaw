import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api.js";
import { useProject } from "../lib/ProjectContext.js";
import type { WorkflowTemplate, WorkflowStepDefinition } from "../lib/types.js";
import type { ReactElement } from "react";

function WorkflowStepEditor({
  step,
  onChange,
}: {
  step: WorkflowStepDefinition;
  onChange: (updated: WorkflowStepDefinition) => void;
}): ReactElement {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50">
      <input
        type="checkbox"
        checked={step.enabled}
        onChange={(e) => { onChange({ ...step, enabled: e.target.checked }); }}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{step.name}</p>
        {step.agentName && <p className="text-xs text-gray-500">Agent: {step.agentName}</p>}
      </div>
      <div className="flex items-center gap-2">
        {step.requiresApproval && (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
            Approval
          </span>
        )}
        <label className="flex items-center gap-1 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={step.requiresApproval ?? false}
            onChange={(e) => { onChange({ ...step, requiresApproval: e.target.checked }); }}
            className="h-3 w-3 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
          />
          Require approval
        </label>
      </div>
    </div>
  );
}

export function Workflows(): ReactElement {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSteps, setEditSteps] = useState<WorkflowStepDefinition[]>([]);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [validateResult, setValidateResult] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const { activeProject } = useProject();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await api.listWorkflowTemplates(activeProject?.id);
      if (all.length === 0) {
        const defaults = getDefaultTemplates();
        for (const t of defaults) {
          try {
            await api.createWorkflowTemplate(t);
          } catch {
            // ignore duplicates
          }
        }
        const refreshed = await api.listWorkflowTemplates(activeProject?.id);
        setTemplates(refreshed);
      } else {
        setTemplates(all);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const handleSelect = (template: WorkflowTemplate): void => {
    setSelectedTemplate(template);
    setEditMode(false);
    setEditName(template.name);
    setEditSteps(template.steps.map((s) => ({ ...s })));
    setValidateResult(null);
  };

  const handleEdit = (): void => {
    if (!selectedTemplate) return;
    setEditMode(true);
    setEditName(selectedTemplate.name);
    setEditSteps(selectedTemplate.steps.map((s) => ({ ...s })));
    setValidateResult(null);
  };

  const handleSave = async (): Promise<void> => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      const updated = await api.updateWorkflowTemplate(selectedTemplate.workflowTemplateId, {
        name: editName,
        steps: editSteps.map((s, i) => ({ ...s, order: i })),
      });
      setTemplates((prev) =>
        prev.map((t) => (t.workflowTemplateId === updated.workflowTemplateId ? updated : t)),
      );
      setSelectedTemplate(updated);
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleStepChange = (index: number, updated: WorkflowStepDefinition): void => {
    setEditSteps((prev) => prev.map((s, i) => (i === index ? updated : s)));
  };

  const handleCreateCustom = async (): Promise<void> => {
    const defaultSteps: WorkflowStepDefinition[] = [
      { id: "ba", name: "BA Analysis", agentName: "BA", enabled: true, producesArtifacts: true, order: 0 },
      { id: "architect", name: "Architecture Design", agentName: "Architect", enabled: true, producesArtifacts: true, order: 1 },
      { id: "pm", name: "Task Breakdown", agentName: "PM", enabled: true, producesArtifacts: true, order: 2 },
      { id: "qa", name: "Test Planning", agentName: "QA", enabled: true, producesArtifacts: true, order: 3 },
    ];
    try {
      const created = await api.createWorkflowTemplate({
        name: "Custom Workflow",
        description: "Your custom workflow",
        steps: defaultSteps as Parameters<typeof api.createWorkflowTemplate>[0]["steps"],
        isDefault: false,
      });
      setTemplates((prev) => [...prev, created]);
      handleSelect(created);
      setEditMode(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workflow");
    }
  };

  const handleDuplicate = async (): Promise<void> => {
    if (!selectedTemplate) return;
    setDuplicateLoading(true);
    try {
      const dup = await api.duplicateWorkflowTemplate(selectedTemplate.workflowTemplateId);
      setTemplates((prev) => [...prev, dup]);
      handleSelect(dup);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate");
    } finally {
      setDuplicateLoading(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedTemplate) return;
    if (!window.confirm(`Delete "${selectedTemplate.name}"?`)) return;
    try {
      await api.deleteWorkflowTemplate(selectedTemplate.workflowTemplateId);
      setTemplates((prev) => prev.filter((t) => t.workflowTemplateId !== selectedTemplate.workflowTemplateId));
      setSelectedTemplate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleValidate = async (): Promise<void> => {
    if (!selectedTemplate) return;
    try {
      const result = await api.validateWorkflowTemplate(selectedTemplate.workflowTemplateId);
      setValidateResult(result);
    } catch (err) {
      setValidateResult({ valid: false, errors: [(err instanceof Error ? err.message : "Validation failed")], warnings: [] });
    }
  };

  const enabledSteps = (editMode ? editSteps : (selectedTemplate?.steps ?? [])).filter(
    (s) => s.enabled,
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
        <div className="rounded-lg border bg-white p-6 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading workflows...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-500 mt-1">
            Server-backed workflow templates. Create and manage custom workflows for your project.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCreateCustom()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            New Custom Workflow
          </button>
          <button
            type="button"
            onClick={() => void fetchTemplates()}
            className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <p className="text-sm text-yellow-700">{error}</p>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-900">No workflow templates</p>
          <p className="mt-1 text-sm text-gray-500">Create a custom workflow to get started.</p>
          <button
            type="button"
            onClick={() => void handleCreateCustom()}
            className="inline-block mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Create Workflow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900 px-1">Templates</h2>
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.workflowTemplateId}
                  type="button"
                  onClick={() => { handleSelect(t); }}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedTemplate?.workflowTemplateId === t.workflowTemplateId
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{t.name}</p>
                    {t.isDefault && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t.steps.length} steps · {t.steps.filter((s) => (s as WorkflowStepDefinition & { requiresApproval?: boolean }).requiresApproval).length} approvals
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {!selectedTemplate ? (
              <div className="rounded-lg border bg-white p-6 text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                <p className="mt-4 text-sm font-medium text-gray-900">Select a workflow template</p>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a template from the left or create a custom workflow.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border bg-white">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  {editMode ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => { setEditName(e.target.value); }}
                      className="text-lg font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent"
                    />
                  ) : (
                    <h2 className="text-lg font-bold text-gray-900">{selectedTemplate.name}</h2>
                  )}
                  <div className="flex items-center gap-2">
                    {!editMode ? (
                      <>
                        <button type="button" onClick={handleEdit} className="text-sm text-blue-600 hover:text-blue-500 transition-colors">
                          Edit
                        </button>
                        {!selectedTemplate.isDefault && (
                          <button type="button" onClick={() => void handleDelete()} className="text-sm text-red-500 hover:text-red-400 transition-colors">
                            Delete
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDuplicate()}
                          disabled={duplicateLoading}
                          className="text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                        >
                          {duplicateLoading ? "Duplicating..." : "Duplicate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleValidate()}
                          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          Validate
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => { setEditMode(false); }} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSave()}
                          disabled={saving}
                          className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {selectedTemplate.description && !editMode && (
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
                  </div>
                )}

                {validateResult && (
                  <div className={`px-4 py-3 border-b ${validateResult.valid ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <p className={`text-sm font-medium ${validateResult.valid ? "text-green-700" : "text-red-700"}`}>
                      {validateResult.valid ? "Workflow is valid" : "Workflow has errors"}
                    </p>
                    {validateResult.errors.length > 0 && (
                      <ul className="list-disc list-inside text-sm text-red-600 mt-1">
                        {validateResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    )}
                    {validateResult.warnings.length > 0 && (
                      <ul className="list-disc list-inside text-sm text-yellow-600 mt-1">
                        {validateResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Steps ({enabledSteps.length} enabled)
                    </h3>
                    {editMode && (
                      <span className="text-xs text-gray-400">
                        {editSteps.filter((s) => s.enabled).length}/{editSteps.length} enabled
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {(editMode ? editSteps : selectedTemplate.steps).map((step, i) => (
                      <div key={step.id} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                        {editMode ? (
                          <WorkflowStepEditor step={step} onChange={(s) => { handleStepChange(i, s); }} />
                        ) : (
                          <div className={`flex-1 flex items-center gap-3 py-2 px-3 rounded-lg ${!step.enabled ? "opacity-50" : ""}`}>
                            <div className={`w-2 h-2 rounded-full ${step.enabled ? "bg-green-500" : "bg-gray-300"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900">{step.name}</p>
                              {step.agentName && <p className="text-xs text-gray-500">{step.agentName}</p>}
                            </div>
                            {step.requiresApproval && (
                              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                Requires Approval
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {!editMode && enabledSteps.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Workflow Preview</h3>
                      <div className="flex items-center flex-wrap gap-1">
                        {enabledSteps.map((step, i) => (
                          <span key={step.id} className="flex items-center gap-1">
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                              {step.name}
                            </span>
                            {i < enabledSteps.length - 1 && (
                              <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getDefaultTemplates() {
  return [
    {
      name: "Docs Only",
      description: "Generate documentation artifacts without code execution",
      isDefault: true,
      steps: [
        { id: "ba", name: "BA Analysis", agentName: "BA", enabled: true, producesArtifacts: true, order: 0 },
        { id: "architect", name: "Architecture Design", agentName: "Architect", enabled: true, producesArtifacts: true, order: 1 },
        { id: "pm", name: "Task Breakdown", agentName: "PM", enabled: true, producesArtifacts: true, order: 2 },
        { id: "qa", name: "Test Planning", agentName: "QA", enabled: true, producesArtifacts: true, order: 3 },
        { id: "reporter", name: "Final Report", agentName: "Reporter", enabled: true, producesArtifacts: true, order: 4 },
      ],
    },
    {
      name: "Assisted (with UX)",
      description: "Full assisted workflow with UX research, design, and coding plan",
      isDefault: false,
      steps: [
        { id: "ba", name: "BA Analysis", agentName: "BA", enabled: true, producesArtifacts: true, order: 0 },
        { id: "architect", name: "Architecture Design", agentName: "Architect", enabled: true, producesArtifacts: true, order: 1 },
        { id: "ux", name: "UX Research", agentName: "UX Researcher", enabled: true, producesArtifacts: true, order: 2 },
        { id: "pm", name: "Task Breakdown", agentName: "PM", enabled: true, producesArtifacts: true, order: 3 },
        { id: "qa", name: "Test Planning", agentName: "QA", enabled: true, producesArtifacts: true, order: 4 },
        { id: "developer", name: "Implementation", agentName: "Developer", enabled: true, requiresApproval: true, producesArtifacts: true, order: 5 },
        { id: "reporter", name: "Final Report", agentName: "Reporter", enabled: true, producesArtifacts: true, order: 6 },
      ],
    },
    {
      name: "Semi-Auto (with Code)",
      description: "Full workflow including code generation, testing, and review",
      isDefault: false,
      steps: [
        { id: "ba", name: "BA Analysis", agentName: "BA", enabled: true, producesArtifacts: true, order: 0 },
        { id: "architect", name: "Architecture Design", agentName: "Architect", enabled: true, producesArtifacts: true, order: 1 },
        { id: "pm", name: "Task Breakdown", agentName: "PM", enabled: true, producesArtifacts: true, order: 2 },
        { id: "qa", name: "Test Planning", agentName: "QA", enabled: true, producesArtifacts: true, order: 3 },
        { id: "developer", name: "Code Generation", agentName: "Developer", enabled: true, requiresApproval: true, producesArtifacts: true, order: 4 },
        { id: "reviewer", name: "Code Review", agentName: "Reviewer", enabled: true, producesArtifacts: true, order: 5 },
        { id: "reporter", name: "Final Report", agentName: "Reporter", enabled: true, producesArtifacts: true, order: 6 },
      ],
    },
  ];
}
