import { slackRequest, SlackApiError, type SlackConfig } from "./slackApiService.js";

export type { SlackConfig };

export interface SlackMessage {
  channel: string;
  text: string;
  mrkdwn: boolean;
}

export interface SlackResult {
  success: boolean;
  ts?: string | undefined;
  error?: string | undefined;
}

export interface SlackStatus {
  configured: boolean;
  enabled: boolean;
  hasToken: boolean;
  channelId?: string | undefined;
  overall: "ok" | "not_configured" | "missing_token" | "missing_channel";
}

export interface AuthTestResult {
  ok: boolean;
  url?: string | undefined;
  team?: string | undefined;
  user?: string | undefined;
  team_id?: string | undefined;
  user_id?: string | undefined;
  error?: string | undefined;
}

function getSlackToken(config: SlackConfig): string | undefined {
  return process.env[config.tokenEnvRef];
}

export function getSlackStatus(config: SlackConfig): SlackStatus {
  if (!config.enabled) {
    return {
      configured: false,
      enabled: false,
      hasToken: false,
      overall: "not_configured",
    };
  }

  const token = getSlackToken(config);

  if (!config.channelId) {
    return {
      configured: true,
      enabled: true,
      hasToken: !!token,
      overall: "missing_channel",
    };
  }

  if (!token) {
    return {
      configured: true,
      enabled: true,
      hasToken: false,
      channelId: config.channelId,
      overall: "missing_token",
    };
  }

  return {
    configured: true,
    enabled: true,
    hasToken: true,
    channelId: config.channelId,
    overall: "ok",
  };
}

export async function testConnection(config: SlackConfig): Promise<{
  success: boolean;
  message: string;
  team?: string | undefined;
  user?: string | undefined;
}> {
  if (!config.enabled) {
    return { success: false, message: "Slack integration is not enabled." };
  }

  const token = getSlackToken(config);
  if (!token) {
    return {
      success: false,
      message: `Slack token not found. Set ${config.tokenEnvRef} environment variable.`,
    };
  }

  try {
    const result = await slackRequest<AuthTestResult>(config, "auth.test", {});
    return {
      success: true,
      message: `Connected to Slack as ${result.user ?? "unknown"} in team ${result.team ?? "unknown"}`,
      team: result.team,
      user: result.user,
    };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function postMessage(
  message: SlackMessage,
  config: SlackConfig,
): Promise<SlackResult> {
  if (!config.enabled) {
    return { success: false, error: "Slack integration is not enabled." };
  }

  const token = getSlackToken(config);
  if (!token) {
    return {
      success: false,
      error: `Slack token not found. Set ${config.tokenEnvRef} environment variable.`,
    };
  }

  const channel = message.channel || config.channelId;
  if (!channel) {
    return { success: false, error: "Slack channel ID is not configured." };
  }

  try {
    const body: Record<string, unknown> = {
      channel,
      text: message.text,
      mrkdwn: message.mrkdwn,
    };

    const result = await slackRequest<{ ok: boolean; ts?: string; error?: string }>(
      config,
      "chat.postMessage",
      body,
    );

    return { success: true, ts: result.ts };
  } catch (e) {
    if (e instanceof SlackApiError) {
      return { success: false, error: e.message };
    }
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
