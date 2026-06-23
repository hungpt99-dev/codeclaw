import type { AiAdapterName, AiTaskInput, AiTaskResult } from "@aiteam/shared";

export interface AiCliAdapter {
  name: AiAdapterName;
  isAvailable(): Promise<boolean>;
  runTask(input: AiTaskInput): Promise<AiTaskResult>;
}

export type { AiAdapterName, AiTaskInput, AiTaskResult };
