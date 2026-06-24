export interface SlackConfig {
  enabled: boolean;
  channelId?: string | undefined;
  tokenEnvRef: string;
  notifyOn: (
    | "docs_generated"
    | "code_generated"
    | "test_passed"
    | "test_failed"
    | "report_ready"
  )[];
}

export class SlackApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "SlackApiError";
  }
}

function getSlackToken(config: SlackConfig): string | undefined {
  const legacyMap: Record<string, string> = {
    CODECLAW_SLACK_TOKEN: "AITEAM_SLACK_TOKEN",
  };
  const legacyKey = legacyMap[config.tokenEnvRef];
  return process.env[config.tokenEnvRef] ?? (legacyKey ? process.env[legacyKey] : undefined);
}

export async function slackRequest<T>(
  config: SlackConfig,
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  const token = getSlackToken(config);
  if (!token) {
    throw new SlackApiError(
      `Slack token not found. Set ${config.tokenEnvRef} environment variable.`,
    );
  }

  try {
    const response = await fetch(`https://slack.com/api/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new SlackApiError(
        `Slack API error (${String(response.status)}): ${text.slice(0, 300)}`,
        response.status,
      );
    }

    const json = (await response.json()) as { ok: boolean; error?: string };

    if (!json.ok) {
      if (json.error === "invalid_auth") {
        throw new SlackApiError("Invalid Slack token. Check your bot token.", 401);
      }
      if (json.error === "not_authenticated") {
        throw new SlackApiError("Not authenticated with Slack.", 401);
      }
      if (json.error === "channel_not_found") {
        throw new SlackApiError("Slack channel not found. Check the channel ID.", 404);
      }
      if (json.error === "missing_scope") {
        throw new SlackApiError("Missing required Slack scope. Need: chat:write", 403);
      }
      if (json.error === "ratelimited") {
        throw new SlackApiError("Rate limited by Slack API. Try again later.", 429);
      }
      throw new SlackApiError(`Slack API error: ${json.error ?? "unknown"}`);
    }

    return json as unknown as T;
  } catch (e) {
    if (e instanceof SlackApiError) throw e;
    if (e instanceof TypeError && e.message.includes("fetch")) {
      throw new SlackApiError("Network error: Cannot reach Slack API.");
    }
    throw new SlackApiError(`Request failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
