export interface Run {
  id: string;
  title: string;
  rawRequirement: string;
  mode: string;
  outputLanguage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  runId: string;
  type: string;
  name: string;
  path: string;
  format: string;
  createdAt: string;
  content?: string;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface PromptFile {
  name: string;
  path: string;
}

export interface PromptDetail {
  name: string;
  content: string;
}

export interface Approval {
  id: string;
  runId: string;
  gate: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
