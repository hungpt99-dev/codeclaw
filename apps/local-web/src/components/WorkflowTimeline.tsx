import type { ReactElement } from "react";

export interface TimelineStage {
  id: string;
  label: string;
  status: "completed" | "active" | "pending";
}

interface WorkflowTimelineProps {
  stages: TimelineStage[];
}

export function WorkflowTimeline({ stages }: WorkflowTimelineProps): ReactElement {
  if (stages.length === 0) {
    return <div />;
  }

  return (
    <div className="space-y-0">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Progress</h3>
      <div className="relative">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-start gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                  stage.status === "completed"
                    ? "bg-green-500 border-green-500"
                    : stage.status === "active"
                      ? "bg-blue-500 border-blue-500 animate-pulse"
                      : "bg-gray-200 border-gray-300"
                }`}
              />
              {index < stages.length - 1 && (
                <div
                  className={`w-0.5 h-full mt-1 ${
                    stage.status === "completed" ? "bg-green-300" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <span
                className={`text-sm ${
                  stage.status === "completed"
                    ? "text-green-700 font-medium"
                    : stage.status === "active"
                      ? "text-blue-700 font-medium"
                      : "text-gray-400"
                }`}
              >
                {stage.status === "active" && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1.5" />
                )}
                {stage.status === "completed" && (
                  <svg
                    className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {stage.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
