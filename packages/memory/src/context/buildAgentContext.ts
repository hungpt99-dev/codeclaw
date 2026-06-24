import type { AgentRole } from "@codeclaw/shared";
import type { ProjectMemoryEntry } from "../retrievers/projectMemoryRetriever.js";
import type { DecisionMemoryEntry } from "../retrievers/decisionMemoryRetriever.js";
import type { AgentMemoryEntry } from "../retrievers/agentMemoryRetriever.js";

export interface AgentContext {
  agentRole: AgentRole;
  rawRequirement: string | undefined;
  projectMemory: { title: string; content: string; path: string }[];
  decisionMemory: { title: string; content: string; path: string }[];
  agentMemory: { title: string; content: string; path: string }[];
  runArtifacts: { type: string; content: string; path: string }[];
}

export interface BuildAgentContextInput {
  agentRole: AgentRole;
  projectRoot: string;
  rawRequirement?: string;
  projectMemory: ProjectMemoryEntry[];
  decisionMemory: DecisionMemoryEntry[];
  agentMemory: AgentMemoryEntry[];
  runArtifacts?: { type: string; content: string; path: string }[];
}

export function buildAgentContext(input: BuildAgentContextInput): AgentContext {
  return {
    agentRole: input.agentRole,
    rawRequirement: input.rawRequirement,
    projectMemory: input.projectMemory,
    decisionMemory: input.decisionMemory,
    agentMemory: input.agentMemory,
    runArtifacts: input.runArtifacts ?? [],
  };
}
