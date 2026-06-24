import type { AiAdapterName, AiTaskInput, AiTaskResult } from "@codeclaw/shared";

export interface AiCliAdapter {
  name: AiAdapterName;
  isAvailable(): Promise<boolean>;
  runTask(input: AiTaskInput): Promise<AiTaskResult>;
}

export type { AiAdapterName, AiTaskInput, AiTaskResult };
