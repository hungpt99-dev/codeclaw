export interface JiraConfig {
  enabled: boolean;
  siteUrl?: string | undefined;
  email?: string | undefined;
  projectKey?: string | undefined;
  defaultIssueType?: string | undefined;
  tokenEnvRef: string;
}

export interface JiraIssueInput {
  projectKey: string;
  summary: string;
  description: string;
  issueType: string;
  parentKey?: string | undefined;
}

export interface JiraIssueResult {
  success: boolean;
  key?: string | undefined;
  url?: string | undefined;
  error?: string | undefined;
}

export interface JiraTestConnectionResult {
  success: boolean;
  message: string;
  accountId?: string | undefined;
  displayName?: string | undefined;
}

export interface JiraStatus {
  configured: boolean;
  enabled: boolean;
  hasToken: boolean;
  siteUrl?: string | undefined;
  projectKey?: string | undefined;
  overall: "ok" | "not_configured" | "missing_token" | "missing_config";
}

function getJiraToken(config: JiraConfig): string | undefined {
  return process.env[config.tokenEnvRef];
}

export function getJiraStatus(config: JiraConfig): JiraStatus {
  if (!config.enabled) {
    return {
      configured: false,
      enabled: false,
      hasToken: false,
      overall: "not_configured",
    };
  }

  const token = getJiraToken(config);
  const missingConfig = !config.siteUrl || !config.email || !config.projectKey;

  if (missingConfig) {
    return {
      configured: true,
      enabled: true,
      hasToken: !!token,
      siteUrl: config.siteUrl,
      projectKey: config.projectKey,
      overall: "missing_config",
    };
  }

  if (!token) {
    return {
      configured: true,
      enabled: true,
      hasToken: false,
      siteUrl: config.siteUrl,
      projectKey: config.projectKey,
      overall: "missing_token",
    };
  }

  return {
    configured: true,
    enabled: true,
    hasToken: true,
    siteUrl: config.siteUrl,
    projectKey: config.projectKey,
    overall: "ok",
  };
}

export async function testConnection(config: JiraConfig): Promise<JiraTestConnectionResult> {
  if (!config.enabled) {
    return { success: false, message: "Jira integration is not enabled." };
  }

  if (!config.siteUrl || !config.email) {
    return { success: false, message: "Jira siteUrl and email are required." };
  }

  const token = getJiraToken(config);
  if (!token) {
    return {
      success: false,
      message: `Jira token not found. Set ${config.tokenEnvRef} environment variable.`,
    };
  }

  try {
    const baseUrl = config.siteUrl.replace(/\/+$/, "");
    const auth = btoa(`${config.email}:${token}`);
    const response = await fetch(`${baseUrl}/rest/api/3/myself`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        success: false,
        message: `Jira API error (${String(response.status)}): ${text.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as { accountId?: string; displayName?: string };
    return {
      success: true,
      message: `Connected to Jira as ${data.displayName ?? "unknown"}`,
      accountId: data.accountId,
      displayName: data.displayName,
    };
  } catch (e) {
    return {
      success: false,
      message: `Connection failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function createIssue(
  input: JiraIssueInput,
  config: JiraConfig,
): Promise<JiraIssueResult> {
  if (!config.enabled || !config.siteUrl || !config.email) {
    return { success: false, error: "Jira is not configured." };
  }

  const token = getJiraToken(config);
  if (!token) {
    return {
      success: false,
      error: `Jira token not found. Set ${config.tokenEnvRef} environment variable.`,
    };
  }

  try {
    const baseUrl = config.siteUrl.replace(/\/+$/, "");
    const auth = btoa(`${config.email}:${token}`);

    const body: Record<string, unknown> = {
      fields: {
        project: { key: input.projectKey },
        summary: input.summary,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: input.description }],
            },
          ],
        },
        issuetype: { name: input.issueType },
      },
    };

    if (input.parentKey) {
      (body.fields as Record<string, unknown>).parent = { key: input.parentKey };
    }

    const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        success: false,
        error: `Failed to create issue (${String(response.status)}): ${text.slice(0, 300)}`,
      };
    }

    const data = (await response.json()) as { key?: string; self?: string };
    return {
      success: true,
      key: data.key,
      url: `${config.siteUrl}/browse/${data.key ?? ""}`,
    };
  } catch (e) {
    return {
      success: false,
      error: `Failed to create issue: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export interface CreateIssuesFromRunInput {
  title: string;
  requirementSummary: string;
  taskBreakdown: string;
  acceptanceCriteria: string;
  technicalDesign?: string | undefined;
}

export async function createIssuesFromRun(
  input: CreateIssuesFromRunInput,
  config: JiraConfig,
): Promise<JiraIssueResult[]> {
  const results: JiraIssueResult[] = [];

  if (!config.projectKey) {
    return [{ success: false, error: "Jira project key is not configured." }];
  }

  const epicResult = await createIssue(
    {
      projectKey: config.projectKey,
      summary: input.title,
      description: input.requirementSummary,
      issueType: "Epic",
    },
    config,
  );
  results.push(epicResult);

  if (!epicResult.success || !epicResult.key) {
    return results;
  }

  const stories = extractStoriesForCreate(input.taskBreakdown, input.requirementSummary);
  for (const story of stories) {
    const storyResult = await createIssue(
      {
        projectKey: config.projectKey,
        summary: story.title,
        description: story.description,
        issueType: "Story",
        parentKey: epicResult.key,
      },
      config,
    );
    results.push(storyResult);

    if (storyResult.success && storyResult.key) {
      for (const task of story.tasks) {
        const taskResult = await createIssue(
          {
            projectKey: config.projectKey,
            summary: task,
            description: `Subtask of ${storyResult.key}`,
            issueType: "Subtask",
            parentKey: storyResult.key,
          },
          config,
        );
        results.push(taskResult);
      }
    }
  }

  return results;
}

function extractStoriesForCreate(
  breakdown: string,
  requirementSummary: string,
): { title: string; description: string; tasks: string[] }[] {
  const stories: { title: string; description: string; tasks: string[] }[] = [];
  const phaseRegex = /###?\s+(Phase\s+\d+|Core|Foundation|Integration|Quality)[^]*?(?=###?\s+|$)/gi;
  const phaseMatches: string[] = [];
  let pm: RegExpExecArray | null;
  while ((pm = phaseRegex.exec(breakdown)) !== null) {
    if (pm[0]) phaseMatches.push(pm[0]);
  }

  for (let i = 0; i < phaseMatches.length; i++) {
    const phase = phaseMatches[i] ?? "";
    const titleMatch = /###?\s+(.+)/.exec(phase);
    const phaseTitle = titleMatch?.[1]?.trim() ?? `Phase ${String(i + 1)}`;
    const tasks: string[] = [];
    const taskRegex = /\|\s*(\S+)\s*\|\s*([^|]+?)\s*\|/g;
    let m: RegExpExecArray | null;
    while ((m = taskRegex.exec(phase)) !== null) {
      const id = m[1]?.trim();
      const t = m[2]?.trim();
      if (id && t && !["Task ID", "---"].includes(id)) {
        tasks.push(`${id}: ${t}`);
      }
    }
    stories.push({
      title: `${phaseTitle}: ${requirementSummary.slice(0, 60)}`,
      description: `Implement ${phaseTitle.toLowerCase()} for: ${requirementSummary}`,
      tasks,
    });
  }

  return stories;
}
