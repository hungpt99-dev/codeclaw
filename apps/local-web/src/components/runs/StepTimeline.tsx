import { useState, type ReactElement } from "react";
import type { StepRun } from "../../lib/types.js";

interface StepTimelineProps {
  steps: StepRun[];
  onStepClick?: (step: StepRun) => void;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${String(ms)}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${String(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes)}m ${String(seconds % 60)}s`;
}

function StatusIcon({ status }: { status: string }): ReactElement {
  const icons: Record<string, ReactElement> = {
    COMPLETED: <span className="text-green-500">✅</span>,
    RUNNING: <span className="text-blue-500 animate-pulse">⏳</span>,
    FAILED: <span className="text-red-500">❌</span>,
    SKIPPED: <span className="text-gray-400">⏭️</span>,
    PENDING: <span className="text-gray-300">⏸️</span>,
  };
  return icons[status] ?? <span className="text-gray-400">❓</span>;
}

export function StepTimeline({ steps, onStepClick }: StepTimelineProps): ReactElement {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  if (steps.length === 0) {
    return (
      <div className="rounded-md bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-400">No step tracking data available for this run.</p>
      </div>
    );
  }

  const handleClick = (step: StepRun): void => {
    setExpandedStep(expandedStep === step.id ? null : step.id);
    onStepClick?.(step);
  };

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Step
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Agent
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Duration
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Error
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {steps.map((step) => (
            <tr
              key={step.id}
              onClick={() => {
                handleClick(step);
              }}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <td className="px-4 py-3 text-sm text-gray-500">{step.stepIndex + 1}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{step.stepName}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{step.agentRole ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <StatusIcon status={step.status} />
                  <span className="text-sm text-gray-700">{step.status}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{formatDuration(step.durationMs)}</td>
              <td className="px-4 py-3 text-right">
                {step.errorMessage ? (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    Error
                  </span>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
