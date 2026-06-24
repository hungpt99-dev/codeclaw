import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();

globalThis.fetch = mockFetch;

import { slackRequest, SlackApiError } from "./slackApiService.js";
import type { SlackConfig } from "./slackAdapter.js";

const mockConfig: SlackConfig = {
  enabled: true,
  channelId: "C12345",
  tokenEnvRef: "CODECLAW_SLACK_TOKEN",
  notifyOn: ["report_ready"],
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CODECLAW_SLACK_TOKEN = "xoxb-test-token";
});

afterEach(() => {
  delete process.env.CODECLAW_SLACK_TOKEN;
});

function resolveOk(data: Record<string, unknown>): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

function rejectWithError(error: string): Response {
  return {
    ok: false,
    status: 500,
    json: () => Promise.resolve({ ok: false, error }),
    text: () => Promise.resolve(error),
  } as Response;
}

describe("slackRequest", () => {
  it("makes a POST request to the Slack API", async () => {
    mockFetch.mockResolvedValue(resolveOk({ ok: true }));

    const result = await slackRequest<{ ok: boolean }>(mockConfig, "auth.test", {});

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://slack.com/api/auth.test",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer xoxb-test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    );
  });

  it("throws SlackApiError when token is missing", async () => {
    delete process.env.CODECLAW_SLACK_TOKEN;
    await expect(slackRequest(mockConfig, "auth.test", {})).rejects.toThrow(SlackApiError);
    await expect(slackRequest(mockConfig, "auth.test", {})).rejects.toThrow(
      "Slack token not found",
    );
  });

  it("throws SlackApiError on invalid auth", async () => {
    mockFetch.mockResolvedValue(resolveOk({ ok: false, error: "invalid_auth" }));
    await expect(slackRequest(mockConfig, "auth.test", {})).rejects.toThrow(SlackApiError);
    await expect(slackRequest(mockConfig, "auth.test", {})).rejects.toThrow("Invalid Slack token");
  });

  it("throws SlackApiError on channel_not_found", async () => {
    mockFetch.mockResolvedValue(resolveOk({ ok: false, error: "channel_not_found" }));
    await expect(slackRequest(mockConfig, "chat.postMessage", {})).rejects.toThrow(SlackApiError);
    await expect(slackRequest(mockConfig, "chat.postMessage", {})).rejects.toThrow(
      "Slack channel not found",
    );
  });

  it("throws SlackApiError on missing_scope", async () => {
    mockFetch.mockResolvedValue(resolveOk({ ok: false, error: "missing_scope" }));
    await expect(slackRequest(mockConfig, "chat.postMessage", {})).rejects.toThrow(SlackApiError);
    await expect(slackRequest(mockConfig, "chat.postMessage", {})).rejects.toThrow(
      "Missing required Slack scope",
    );
  });

  it("throws SlackApiError on rate limiting", async () => {
    mockFetch.mockResolvedValue(resolveOk({ ok: false, error: "ratelimited" }));
    await expect(slackRequest(mockConfig, "auth.test", {})).rejects.toThrow(SlackApiError);
    await expect(slackRequest(mockConfig, "auth.test", {})).rejects.toThrow("Rate limited");
  });

  it("throws SlackApiError on HTTP error", async () => {
    mockFetch.mockResolvedValue(rejectWithError("Internal server error"));
    await expect(slackRequest(mockConfig, "auth.test", {})).rejects.toThrow(SlackApiError);
  });

  it("throws SlackApiError on network error", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    await expect(slackRequest(mockConfig, "auth.test", {})).rejects.toThrow(SlackApiError);
    await expect(slackRequest(mockConfig, "auth.test", {})).rejects.toThrow(
      "Network error: Cannot reach Slack API",
    );
  });
});
