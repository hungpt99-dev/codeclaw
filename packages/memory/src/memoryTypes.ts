import type { AgentRole } from "@aiteam/shared";

export interface InitializeRuntimeMemoryOptions {
  projectRoot: string;
  force?: boolean | undefined;
}

export interface LoadRuntimeMemoryContextOptions {
  projectRoot: string;
  runId?: string;
  agentRole?: AgentRole;
  tags?: string[];
}

export interface MemoryInitializationResult {
  memoryDir: string;
  filesCreated: string[];
  filesSkipped: string[];
  itemsIndexed: number;
}

export interface MemoryStatus {
  exists: boolean;
  projectMemoryCount: number;
  decisionMemoryCount: number;
  agentMemoryCount: number;
  indexedItemCount: number;
  status: "ok" | "missing" | "partial";
}
