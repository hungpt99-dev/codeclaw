import type { Run, Artifact, Setting, PromptFile, PromptDetail } from "./types.js";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    let errorMessage: string | undefined;
    try {
      errorMessage = (JSON.parse(text) as { error?: string }).error;
    } catch {
      /* not JSON */
    }
    throw new Error(errorMessage ?? `Request failed: ${String(res.status)}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health(): Promise<{ status: string }> {
    return request("/health");
  },

  async listRuns(): Promise<Run[]> {
    const data = await request<{ runs: Run[] }>("/runs");
    return data.runs;
  },

  async getRun(id: string): Promise<Run> {
    const data = await request<{ run: Run }>(`/runs/${id}`);
    return data.run;
  },

  async createRun(requirement: string): Promise<Run> {
    const data = await request<{ run: Run }>("/runs", {
      method: "POST",
      body: JSON.stringify({ requirement }),
    });
    return data.run;
  },

  async listArtifacts(runId: string): Promise<Artifact[]> {
    const data = await request<{ artifacts: Artifact[] }>(`/runs/${runId}/artifacts`);
    return data.artifacts;
  },

  async getArtifact(runId: string, artifactId: string): Promise<Artifact> {
    const data = await request<{ artifact: Artifact }>(`/runs/${runId}/artifacts/${artifactId}`);
    return data.artifact;
  },

  async listSettings(): Promise<Setting[]> {
    const data = await request<{ settings: Setting[] }>("/settings");
    return data.settings;
  },

  async updateSettings(settings: Record<string, string>): Promise<Setting[]> {
    const data = await request<{ settings: Setting[] }>("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
    return data.settings;
  },

  async listPrompts(): Promise<PromptFile[]> {
    const data = await request<{ prompts: PromptFile[] }>("/prompts");
    return data.prompts;
  },

  async getPrompt(name: string): Promise<PromptDetail> {
    return request<PromptDetail>(`/prompts/${name}`);
  },

  async updatePrompt(name: string, content: string): Promise<void> {
    await request(`/prompts/${name}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  },
};
