import type { ReactElement } from "react";
import type { StepRun } from "../../lib/types.js";

interface StepDetailPanelProps {
  step: StepRun;
  isExpanded: boolean;
  onClose?: () => void;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${String(ms)}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${String(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes)}m ${String(seconds % 60)}s`;
}

export function StepDetailPanel({ step, isExpanded, onClose }: StepDetailPanelProps): ReactElement {
  if (!isExpanded) return <div />;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mt-2 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">
          Step {step.stepIndex + 1}: {step.stepName}
        </h4>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Close
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Agent</span>
          <p className="font-medium text-gray-900">{step.agentRole ?? "—"}</p>
        </div>
        <div>
          <span className="text-gray-500">Status</span>
          <p className="font-medium text-gray-900">{step.status}</p>
        </div>
        <div>
          <span className="text-gray-500">Duration</span>
          <p className="font-medium text-gray-900">{formatDuration(step.durationMs)}</p>
        </div>
        <div>
          <span className="text-gray-500">Started</span>
          <p className="font-medium text-gray-900">
            {step.startedAt ? new Date(step.startedAt).toLocaleString() : "—"}
          </p>
        </div>
      </div>

      {step.errorMessage && (
        <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-xs font-medium text-red-800 mb-1">Error</p>
          <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">
            {step.errorMessage}
          </pre>
        </div>
      )}

      {step.outputArtifactPath && (
        <div className="mt-3">
          <span className="text-xs text-gray-500">Output Artifact</span>
          <p className="text-sm font-mono text-gray-700">{step.outputArtifactPath}</p>
        </div>
      )}
    </div>
  );
}
