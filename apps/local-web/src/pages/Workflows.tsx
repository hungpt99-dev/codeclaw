import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
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
        onChange={(e) => {
          onChange({ ...step, enabled: e.target.checked });
        }}
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
            onChange={(e) => {
              onChange({ ...step, requiresApproval: e.target.checked });
            }}
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
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSteps, setEditSteps] = useState<WorkflowStepDefinition[]>([]);

  useEffect(() => {
    api
      .listWorkflowTemplates()
      .then((all) => {
        const stored = JSON.parse(
          localStorage.getItem("codeclaw_workflow_templates") ?? "[]",
        ) as WorkflowTemplate[];
        setTemplates([...stored, ...all]);
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSelect = (template: WorkflowTemplate): void => {
    setSelectedTemplate(template);
    setEditMode(false);
    setEditName(template.name);
    setEditSteps(template.steps.map((s) => ({ ...s })));
  };

  const handleEdit = (): void => {
    if (!selectedTemplate) return;
    setEditMode(true);
    setEditName(selectedTemplate.name);
    setEditSteps(selectedTemplate.steps.map((s) => ({ ...s })));
  };

  const handleSave = async (): Promise<void> => {
    if (!selectedTemplate) return;
    const updated: WorkflowTemplate = {
      ...selectedTemplate,
      name: editName,
      steps: editSteps,
      updatedAt: new Date().toISOString(),
    };
    await api.saveWorkflowTemplate(updated);
    setTemplates((prev) =>
      prev.map((t) => (t.workflowTemplateId === updated.workflowTemplateId ? updated : t)),
    );
    setSelectedTemplate(updated);
    setEditMode(false);
  };

  const handleStepChange = (index: number, updated: WorkflowStepDefinition): void => {
    setEditSteps((prev) => prev.map((s, i) => (i === index ? updated : s)));
  };

  const handleCreateCustom = (): void => {
    const defaultSteps: WorkflowStepDefinition[] = [
      { id: "ba", name: "BA Analysis", agentName: "BA", enabled: true, producesArtifacts: true },
      {
        id: "architect",
        name: "Architecture Design",
        agentName: "Architect",
        enabled: true,
        producesArtifacts: true,
      },
      { id: "pm", name: "Task Breakdown", agentName: "PM", enabled: true, producesArtifacts: true },
      { id: "qa", name: "Test Planning", agentName: "QA", enabled: true, producesArtifacts: true },
    ];
    const newTemplate: WorkflowTemplate = {
      workflowTemplateId: `custom-${String(Date.now())}`,
      name: "Custom Workflow",
      description: "Your custom workflow",
      steps: defaultSteps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedTemplate(newTemplate);
    setEditMode(true);
    setEditName(newTemplate.name);
    setEditSteps(newTemplate.steps.map((s) => ({ ...s })));
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
            Manage workflow templates and create custom workflows.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateCustom}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          New Custom Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-sm font-semibold text-gray-900 px-1">Templates</h2>
          <div className="space-y-2">
            {templates.map((t) => (
              <button
                key={t.workflowTemplateId}
                type="button"
                onClick={() => {
                  handleSelect(t);
                }}
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
                  {t.steps.length} steps · {t.steps.filter((s) => s.requiresApproval).length}{" "}
                  approvals
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Template Detail / Editor */}
        <div className="lg:col-span-2">
          {!selectedTemplate ? (
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
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
              <p className="mt-4 text-sm font-medium text-gray-900">Select a workflow template</p>
              <p className="mt-1 text-sm text-gray-500">
                Choose a template from the left to view details or create a custom workflow.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-white">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                {editMode ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                    }}
                    className="text-lg font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent"
                  />
                ) : (
                  <h2 className="text-lg font-bold text-gray-900">{selectedTemplate.name}</h2>
                )}
                <div className="flex items-center gap-2">
                  {!editMode ? (
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditMode(false);
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleSave();
                        }}
                        className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                      >
                        Save
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
                        <WorkflowStepEditor
                          step={step}
                          onChange={(s) => {
                            handleStepChange(i, s);
                          }}
                        />
                      ) : (
                        <div
                          className={`flex-1 flex items-center gap-3 py-2 px-3 rounded-lg ${!step.enabled ? "opacity-50" : ""}`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${step.enabled ? "bg-green-500" : "bg-gray-300"}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">{step.name}</p>
                            {step.agentName && (
                              <p className="text-xs text-gray-500">{step.agentName}</p>
                            )}
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

                {/* Workflow Preview */}
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
                            <svg
                              className="w-4 h-4 text-gray-300"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
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
    </div>
  );
}
