import type {
  Run,
  Artifact,
  Setting,
  PromptFile,
  PromptDetail,
  Approval,
  TraceabilityMatrix,
  CodeGenerationResult,
  TestRunResult,
  GitHubStatus,
  GitHubPRSummary,
  GitHubPRInfo,
  GitHubCIRun,
  JiraStatus,
  JiraTestResult,
  SlackStatus,
  SlackTestResult,
  SlackPostResult,
  ExportOptions,
  ExportResult,
  ReviewOutput,
  ReviewArtifacts,
  FixLoopResult,
  AiCliStatusResponse,
  AiCliTestResult,
  StorageInfo,
  StorageCleanResult,
  WorkflowProgressEvent,
  StepRun,
  WorkflowTemplate,
  ProviderConfig,
  NativeRunnerStatus,
  ProjectEntry,
  DoctorStatus,
  DashboardSummary,
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

  async listRuns(projectId?: string): Promise<Run[]> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    const data = await request<{ runs: Run[] }>(`/runs${params}`);
    return data.runs;
  },

  async getRun(id: string, projectId?: string): Promise<Run> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    const data = await request<{ run: Run }>(`/runs/${id}${params}`);
    return data.run;
  },

  async createRun(params: {
    requirement: string;
    outputLanguage: string;
    mode: string;
    projectId?: string;
    workflowTemplateId?: string;
  }): Promise<Run> {
    const data = await request<{ run: Run }>("/runs", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return data.run;
  },

  async listArtifacts(runId: string, projectId?: string): Promise<Artifact[]> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    const data = await request<{ artifacts: Artifact[] }>(`/runs/${runId}/artifacts${params}`);
    return data.artifacts;
  },

  async getArtifact(runId: string, artifactId: string, projectId?: string): Promise<Artifact> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    const data = await request<{ artifact: Artifact }>(`/runs/${runId}/artifacts/${artifactId}${params}`);
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
  ): Promise<{ codeGeneration: CodeGenerationResult; fixLoopResult?: FixLoopResult | null }> {
    return request(`/runs/${runId}/code`, {
      method: "POST",
      body: JSON.stringify({ agent, approved }),
    });
  },

  async getDiffPatch(runId: string, projectId?: string): Promise<{ diffContent: string }> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    return request(`/runs/${runId}/diff${params}`);
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

  async exportRun(
    runId: string,
    options: ExportOptions,
  ): Promise<{ success: boolean; outputPath?: string; result?: ExportResult }> {
    return request(`/runs/${runId}/export`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  },

  async triggerTests(runId: string, commands?: string[]): Promise<TestRunResult> {
    const data = await request<{ testRun: TestRunResult }>(`/runs/${runId}/test`, {
      method: "POST",
      body: JSON.stringify({ commands }),
    });
    return data.testRun;
  },

  async getTestResult(runId: string): Promise<{ testResult: string }> {
    return request(`/runs/${runId}/test-result`);
  },

  async getFailedTests(runId: string): Promise<{ failedTests: string }> {
    return request(`/runs/${runId}/failed-tests`);
  },

  async triggerReview(runId: string): Promise<ReviewOutput> {
    const data = await request<{ review: ReviewOutput }>(`/runs/${runId}/review`, {
      method: "POST",
    });
    return data.review;
  },

  async getReviewArtifacts(runId: string): Promise<ReviewArtifacts> {
    const data = await request<{ review: ReviewArtifacts }>(`/runs/${runId}/review`);
    return data.review;
  },

  async getAiCliStatus(): Promise<AiCliStatusResponse> {
    return request("/settings/ai-cli/status");
  },

  async testAiCli(tool: string): Promise<AiCliTestResult> {
    return request("/settings/ai-cli/test", {
      method: "POST",
      body: JSON.stringify({ tool }),
    });
  },

  async testIntegration(type: string): Promise<AiCliTestResult> {
    return request(`/settings/integrations/test/${type}`);
  },

  async getStorageInfo(): Promise<StorageInfo> {
    return request("/settings/storage");
  },

  async cleanOldRuns(days?: number): Promise<StorageCleanResult> {
    return request("/settings/storage/clean", {
      method: "POST",
      body: JSON.stringify({ days: days ?? 30 }),
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

  subscribeToProgress(
    runId: string,
    onEvent: (event: WorkflowProgressEvent) => void,
    onError?: () => void,
    onReconnecting?: () => void,
  ): () => void {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    function connect(): void {
      eventSource?.close();
      eventSource = new EventSource(`${BASE}/runs/${runId}/progress`);

      eventSource.onmessage = (e: MessageEvent) => {
        try {
          const event = JSON.parse(e.data as string) as WorkflowProgressEvent;
          onEvent(event);
          reconnectAttempts = 0;
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts += 1;
          onReconnecting?.();
          reconnectTimeout = setTimeout(() => {
            connect();
          }, Math.min(1000 * 2 ** reconnectAttempts, 30000));
        } else {
          onError?.();
        }
      };
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      eventSource?.close();
    };
  },

  async listSteps(runId: string, projectId?: string): Promise<StepRun[]> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    const data = await request<{ steps: StepRun[] }>(`/runs/${runId}/steps${params}`);
    return data.steps;
  },

  async getExecutionReport(runId: string, projectId?: string): Promise<{ report: string }> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    return request(`/runs/${runId}/execution-report${params}`);
  },

  async getProviderConfig(): Promise<ProviderConfig> {
    return request("/settings/providers");
  },

  async getNativeRunnerStatus(): Promise<NativeRunnerStatus> {
    return request("/settings/native-runner");
  },

  async getDashboardSummary(projectId?: string): Promise<DashboardSummary> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    return request(`/dashboard/summary${params}`);
  },

  async listWorkflowTemplates(projectId?: string): Promise<WorkflowTemplate[]> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    const data = await request<{ templates: WorkflowTemplate[] }>(`/workflows${params}`);
    return data.templates;
  },

  async createWorkflowTemplate(template: {
    projectId?: string;
    name: string;
    description?: string;
    steps: ({ id: string; name: string; agentName?: string; enabled: boolean; requiresApproval?: boolean; producesArtifacts?: boolean; description?: string; order?: number } & Record<string, unknown>)[];
    isDefault?: boolean;
  }): Promise<WorkflowTemplate> {
    const data = await request<{ template: WorkflowTemplate }>("/workflows", {
      method: "POST",
      body: JSON.stringify(template),
    });
    return data.template;
  },

  async getWorkflowTemplate(id: string, projectId?: string): Promise<WorkflowTemplate> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    const data = await request<{ template: WorkflowTemplate }>(`/workflows/${id}${params}`);
    return data.template;
  },

  async updateWorkflowTemplate(
    id: string,
    template: { name?: string; description?: string; steps?: { id: string; name: string; agentName?: string; enabled: boolean; requiresApproval?: boolean; producesArtifacts?: boolean; description?: string; order: number }[]; isDefault?: boolean },
  ): Promise<WorkflowTemplate> {
    const data = await request<{ template: WorkflowTemplate }>(`/workflows/${id}`, {
      method: "PUT",
      body: JSON.stringify(template),
    });
    return data.template;
  },

  async deleteWorkflowTemplate(id: string): Promise<boolean> {
    const data = await request<{ success: boolean }>(`/workflows/${id}`, { method: "DELETE" });
    return data.success;
  },

  async duplicateWorkflowTemplate(id: string): Promise<WorkflowTemplate> {
    const data = await request<{ template: WorkflowTemplate }>(`/workflows/${id}/duplicate`, { method: "POST" });
    return data.template;
  },

  async validateWorkflowTemplate(id: string): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    return request(`/workflows/${id}/validate`, { method: "POST" });
  },

  async getDoctorStatus(projectId?: string): Promise<DoctorStatus> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    return request(`/doctor${params}`);
  },

  async listProjects(): Promise<{ projects: ProjectEntry[]; activeProjectId: string | null }> {
    return request("/projects");
  },

  async getCurrentProject(): Promise<{ project: ProjectEntry | null }> {
    return request("/projects/current");
  },

  async addProject(rootPath: string, name?: string): Promise<{ project: ProjectEntry }> {
    return request("/projects", {
      method: "POST",
      body: JSON.stringify({ rootPath, name }),
    });
  },

  async useProject(nameOrId: string): Promise<{ project: ProjectEntry }> {
    return request("/projects/use", {
      method: "POST",
      body: JSON.stringify({ nameOrId }),
    });
  },

  async removeProject(projectId: string): Promise<{ success: boolean }> {
    return request(`/projects/${projectId}`, { method: "DELETE" });
  },

  async getProjectStatus(projectId: string): Promise<{
    projectId: string;
    rootPath: string;
    pathExists: boolean;
    codeclawDirExists: boolean;
  }> {
    return request(`/projects/${projectId}/status`);
  },
};
