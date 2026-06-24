import type { ReactElement } from "react";
import type { Run } from "../../lib/types.js";
import { StatusBadge } from "../StatusBadge.js";

interface RunDetailHeaderProps {
  run: Run;
  totalSteps?: number;
  completedSteps?: number;
  failedSteps?: number;
  currentStepName?: string;
}

export function RunDetailHeader({
  run,
  totalSteps = 0,
  completedSteps = 0,
  failedSteps = 0,
  currentStepName,
}: RunDetailHeaderProps): ReactElement {
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{run.title}</h1>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{run.rawRequirement}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={run.status} />
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {run.mode}
          </span>
          {run.createdAt && (
            <span className="text-xs text-gray-400">
              {new Date(run.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {totalSteps > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {completedSteps}/{totalSteps} steps completed
              {failedSteps > 0 && ` · ${String(failedSteps)} failed`}
              {currentStepName && ` · Current: ${currentStepName}`}
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            {progressPct > 0 && (
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${String(progressPct)}%` }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
