export interface ProjectRegistryEntry {
  id: string;
  name: string;
  rootPath: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

export interface ProjectRegistry {
  version: 1;
  projects: ProjectRegistryEntry[];
  activeProjectId: string | null;
}
