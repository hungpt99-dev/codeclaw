import type { ReactElement } from "react";
import type { DiffStatsInfo } from "../lib/diff.js";

interface DiffStatsProps {
  stats: DiffStatsInfo;
}

export function DiffStats({ stats }: DiffStatsProps): ReactElement {
  return (
    <div className="flex items-center gap-4 text-sm flex-wrap">
      <span className="text-gray-700">
        <strong className="text-gray-900">{stats.filesChanged}</strong> file
        {stats.filesChanged !== 1 ? "s" : ""} changed
      </span>
      <span className="text-green-700">
        <strong>+{stats.additions}</strong> additions
      </span>
      <span className="text-red-700">
        <strong>-{stats.deletions}</strong> deletions
      </span>
    </div>
  );
}
