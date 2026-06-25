import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { ReactNode, ReactElement } from "react";
import { api } from "./api.js";
import type { ProjectEntry } from "./types.js";

const BROADCAST_CHANNEL = "codeclaw-project-sync";

interface ProjectContextValue {
  activeProject: ProjectEntry | null;
  projectList: ProjectEntry[];
  loading: boolean;
  error: string | null;
  switchProject: (nameOrId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue>({
  activeProject: null,
  projectList: [],
  loading: true,
  error: null,
  switchProject: async (_nameOrId: string): Promise<void> => { /* noop */ },
  refreshProjects: async (): Promise<void> => { /* noop */ },
});

export function ProjectProvider({ children }: { children: ReactNode }): ReactElement {
  const [activeProject, setActiveProject] = useState<ProjectEntry | null>(null);
  const [projectList, setProjectList] = useState<ProjectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const broadcaster = useRef<BroadcastChannel | null>(null);
  const broadcastKey = useRef(0);

  useEffect(() => {
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL);
      broadcaster.current = bc;

      bc.onmessage = (event) => {
        const data = event.data as { type: string; projectId?: string };
        if (data.type === "PROJECT_CHANGED" && data.projectId) {
          broadcastKey.current += 1;
          void refreshProjects();
        }
      };
    } catch {
      // BroadcastChannel not available
    }

    return () => {
      broadcaster.current?.close();
    };
  }, []);

  const broadcastProjectChange = useCallback((projectId: string): void => {
    try {
      broadcaster.current?.postMessage({ type: "PROJECT_CHANGED", projectId });
    } catch {
      // storage event fallback handled by refresh
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    try {
      const [listRes, currentRes] = await Promise.all([
        api.listProjects(),
        api.getCurrentProject(),
      ]);
      setProjectList(listRes.projects);
      setActiveProject(currentRes.project);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  const switchProject = useCallback(
    async (nameOrId: string) => {
      setLoading(true);
      setError(null);
      try {
        await api.useProject(nameOrId);
        await refreshProjects();
        broadcastProjectChange(nameOrId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to switch project");
        setLoading(false);
      }
    },
    [refreshProjects, broadcastProjectChange],
  );

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  return (
    <ProjectContext.Provider
      value={{
        activeProject,
        projectList,
        loading,
        error,
        switchProject,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  return useContext(ProjectContext);
}
