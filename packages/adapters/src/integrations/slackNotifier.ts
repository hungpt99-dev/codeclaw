import type { SlackConfig, SlackResult } from "./slackAdapter.js";
import { postMessage } from "./slackAdapter.js";

type SlackNotifyEvent =
  | "docs_generated"
  | "code_generated"
  | "test_passed"
  | "test_failed"
  | "report_ready";

export async function notifySlack(
  config: SlackConfig,
  event: SlackNotifyEvent,
  text: string,
  approved?: boolean,
): Promise<SlackResult> {
  if (!config.enabled) {
    return { success: false, error: "Slack integration is not enabled." };
  }

  if (!config.notifyOn.includes(event)) {
    return { success: false, error: `Event '${event}' is not in notifyOn list.` };
  }

  if (!approved) {
    return {
      success: false,
      error: "Approval required. Use --approve or approve via web UI.",
      ts: "GATE_PENDING",
    };
  }

  return postMessage(
    {
      channel: config.channelId ?? "",
      text,
      mrkdwn: true,
    },
    config,
  );
}
