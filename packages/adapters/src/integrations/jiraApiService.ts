import type { JiraConfig } from "./jiraAdapter.js";

export class JiraApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}

function getJiraToken(config: JiraConfig): string | undefined {
  const legacyMap: Record<string, string> = {
    CODECLAW_JIRA_TOKEN: "AITEAM_JIRA_TOKEN",
  };
  const legacyKey = legacyMap[config.tokenEnvRef];
  return process.env[config.tokenEnvRef] ?? (legacyKey ? process.env[legacyKey] : undefined);
}

export async function jiraRequest<T>(
  config: JiraConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  if (!config.siteUrl || !config.email) {
    throw new JiraApiError("Jira siteUrl and email are required.");
  }

  const token = getJiraToken(config);
  if (!token) {
    throw new JiraApiError(`Jira token not found. Set ${config.tokenEnvRef} environment variable.`);
  }

  const baseUrl = config.siteUrl.replace(/\/+$/, "");
  const auth = btoa(`${config.email}:${token}`);

  const headers: Record<string, string> = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
  };

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body !== undefined ? { ...headers, "Content-Type": "application/json" } : headers,
      body: body !== undefined ? JSON.stringify(body) : null,
    });

    if (response.status === 401) {
      throw new JiraApiError("Invalid Jira credentials. Check your email and token.", 401);
    }

    if (response.status === 403) {
      throw new JiraApiError("Access denied. Check your Jira permissions.", 403);
    }

    if (response.status === 404) {
      throw new JiraApiError("Jira resource not found. Check the URL and project key.", 404);
    }

    if (response.status === 429) {
      throw new JiraApiError("Rate limited by Jira API. Try again later.", 429);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new JiraApiError(
        `Jira API error (${String(response.status)}): ${text.slice(0, 300)}`,
        response.status,
      );
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const json: unknown = await response.json();
    return json as T;
  } catch (e) {
    if (e instanceof JiraApiError) throw e;
    if (e instanceof TypeError && e.message.includes("fetch")) {
      throw new JiraApiError(
        `Network error: Cannot reach ${config.siteUrl}. Check the URL and your network.`,
      );
    }
    throw new JiraApiError(`Request failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
