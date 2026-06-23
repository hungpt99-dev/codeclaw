import type {
  Run,
  Artifact,
  Setting,
  PromptFile,
  PromptDetail,
  Approval,
  TraceabilityMatrix,
  CodeGenerationResult,
} from "./types.js";

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

  async createRun(params: {
    rawRequirement: string;
    outputLanguage: string;
    mode: string;
  }): Promise<Run> {
    const data = await request<{ run: Run }>("/runs", {
      method: "POST",
      body: JSON.stringify(params),
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

  async listApprovals(runId: string): Promise<Approval[]> {
    const data = await request<{ approvals: Approval[] }>(`/runs/${runId}/approvals`);
    return data.approvals;
  },

  async analyzeRun(runId: string): Promise<{ analysis: unknown }> {
    return request(`/runs/${runId}/analyze`, { method: "POST" });
  },

  async getTraceability(runId: string): Promise<TraceabilityMatrix> {
    const data = await request<{ traceability: TraceabilityMatrix }>(`/runs/${runId}/traceability`);
    return data.traceability;
  },

  async generateTraceability(runId: string): Promise<TraceabilityMatrix> {
    const data = await request<{ traceability: TraceabilityMatrix }>(
      `/runs/${runId}/traceability`,
      { method: "POST" },
    );
    return data.traceability;
  },

  async triggerCodeGeneration(
    runId: string,
    agent: string,
    approved?: boolean,
  ): Promise<{ codeGeneration: CodeGenerationResult }> {
    return request(`/runs/${runId}/code`, {
      method: "POST",
      body: JSON.stringify({ agent, approved }),
    });
  },

  async getDiffPatch(runId: string): Promise<{ diffContent: string }> {
    return request(`/runs/${runId}/diff`);
  },

  async getChangedFilesList(
    runId: string,
  ): Promise<{ changedFiles: { file: string; status: string }[] }> {
    return request(`/runs/${runId}/changed-files`);
  },

  async getImplementationPrompt(runId: string): Promise<{ prompt: string }> {
    return request(`/runs/${runId}/implementation-prompt`);
  },

  async getAgentLog(runId: string): Promise<{ log: string }> {
    return request(`/runs/${runId}/agent-log`);
  },

  async updateApproval(
    runId: string,
    gate: string,
    status: string,
    note?: string,
  ): Promise<Approval> {
    const data = await request<{ approval: Approval }>(`/runs/${runId}/approvals`, {
      method: "POST",
      body: JSON.stringify({ gate, status, note }),
    });
    return data.approval;
  },
};
