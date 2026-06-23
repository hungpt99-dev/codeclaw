export const MemoryScope = {
  project: "project",
  decision: "decision",
  agent: "agent",
  run: "run",
  artifact: "artifact",
  repo: "repo",
} as const;

export type MemoryScope = (typeof MemoryScope)[keyof typeof MemoryScope];

export const MemoryFormat = {
  markdown: "markdown",
  json: "json",
  text: "text",
} as const;

export type MemoryFormat = (typeof MemoryFormat)[keyof typeof MemoryFormat];

export interface MemoryItem {
  id: string;
  scope: MemoryScope;
  title: string;
  path: string;
  format: MemoryFormat;
  tags: string[];
  summary: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export const AgentRole = {
  ba: "ba",
  architect: "architect",
  pm: "pm",
  qa: "qa",
  reporter: "reporter",
} as const;

export type AgentRole = (typeof AgentRole)[keyof typeof AgentRole];

export interface RuntimeMemoryContext {
  projectMemory: MemoryItem[];
  decisionMemory: MemoryItem[];
  agentMemory: MemoryItem[];
  runMemory: MemoryItem[];
  artifactMemory: MemoryItem[];
}
