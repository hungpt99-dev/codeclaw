import type {
  Run,
  Artifact,
  Setting,
  PromptFile,
  PromptDetail,
  Approval,
  TraceabilityMatrix,
  CodeGenerationResult,
  GitHubStatus,
  GitHubPRSummary,
  GitHubPRInfo,
  GitHubCIRun,
  JiraStatus,
  JiraTestResult,
  SlackStatus,
  SlackTestResult,
  SlackPostResult,
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

  async getGitHubStatus(): Promise<GitHubStatus> {
    const data = await request<{ status: GitHubStatus }>("/integrations/github/status");
    return data.status;
  },

  async testGitHubConnection(): Promise<{ success: boolean; message: string }> {
    return request("/integrations/github/test", { method: "POST" });
  },

  async getGitHubPRs(): Promise<GitHubPRInfo[]> {
    const data = await request<{ prs: GitHubPRInfo[] }>("/integrations/github/prs");
    return data.prs;
  },

  async getGitHubActions(): Promise<GitHubCIRun[]> {
    const data = await request<{ runs: GitHubCIRun[] }>("/integrations/github/actions");
    return data.runs;
  },

  async getJiraStatus(): Promise<JiraStatus> {
    const data = await request<{ status: JiraStatus }>("/integrations/jira/status");
    return data.status;
  },

  async testJiraConnection(): Promise<JiraTestResult> {
    return request("/integrations/jira/test", { method: "POST" });
  },

  async getJiraExport(runId: string): Promise<{ success: boolean; markdown: string }> {
    return request("/integrations/jira/export", {
      method: "POST",
      body: JSON.stringify({ runId }),
    });
  },

  async createJiraIssues(
    runId: string,
    approve?: boolean,
  ): Promise<{
    success: boolean;
    results?: { success: boolean; key?: string; url?: string; error?: string }[];
  }> {
    return request("/integrations/jira/create", {
      method: "POST",
      body: JSON.stringify({ runId, approve }),
    });
  },

  async getSlackStatus(): Promise<SlackStatus> {
    const data = await request<{ status: SlackStatus }>("/integrations/slack/status");
    return data.status;
  },

  async testSlackConnection(): Promise<SlackTestResult> {
    return request("/integrations/slack/test", { method: "POST" });
  },

  async postSlackMessage(
    runId: string,
    event?: string,
    approve?: boolean,
  ): Promise<SlackPostResult> {
    return request("/integrations/slack/post", {
      method: "POST",
      body: JSON.stringify({ runId, event, approve }),
    });
  },

  async createGitHubPR(
    runId: string,
    approve?: boolean,
  ): Promise<{
    success: boolean;
    prUrl?: string;
    summary?: GitHubPRSummary;
    message?: string;
    gate?: string;
  }> {
    return request("/integrations/github/pr", {
      method: "POST",
      body: JSON.stringify({ runId, approve }),
    });
  },
};
