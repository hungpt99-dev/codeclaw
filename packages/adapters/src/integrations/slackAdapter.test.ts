import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();

globalThis.fetch = mockFetch;

import { getSlackStatus, testConnection, postMessage } from "./slackAdapter.js";
import type { SlackConfig } from "./slackAdapter.js";

const baseConfig: SlackConfig = {
  enabled: true,
  channelId: "C12345",
  tokenEnvRef: "AITEAM_SLACK_TOKEN",
  notifyOn: ["report_ready"],
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AITEAM_SLACK_TOKEN = "xoxb-test-token";
});

afterEach(() => {
  delete process.env.AITEAM_SLACK_TOKEN;
});

function mockSlackResponse(data: Record<string, unknown>): Response {
  return {
    ok: data.ok !== false,
    status: data.ok === false ? 400 : 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

describe("getSlackStatus", () => {
  it("returns not_configured when not enabled", () => {
    const result = getSlackStatus({ ...baseConfig, enabled: false });
    expect(result.overall).toBe("not_configured");
    expect(result.enabled).toBe(false);
  });

  it("returns missing_channel when no channelId", () => {
    const noChannelConfig: SlackConfig = {
      enabled: true,
      tokenEnvRef: "AITEAM_SLACK_TOKEN",
      notifyOn: ["report_ready"],
    };
    const result = getSlackStatus(noChannelConfig);
    expect(result.overall).toBe("missing_channel");
  });

  it("returns missing_token when no token", () => {
    delete process.env.AITEAM_SLACK_TOKEN;
    const result = getSlackStatus(baseConfig);
    expect(result.overall).toBe("missing_token");
    expect(result.hasToken).toBe(false);
  });

  it("returns ok when fully configured", () => {
    const result = getSlackStatus(baseConfig);
    expect(result.overall).toBe("ok");
    expect(result.enabled).toBe(true);
    expect(result.hasToken).toBe(true);
    expect(result.channelId).toBe("C12345");
  });
});

describe("testConnection", () => {
  it("fails when not enabled", async () => {
    const result = await testConnection({ ...baseConfig, enabled: false });
    expect(result.success).toBe(false);
    expect(result.message).toContain("not enabled");
  });

  it("fails when token is missing", async () => {
    delete process.env.AITEAM_SLACK_TOKEN;
    const result = await testConnection(baseConfig);
    expect(result.success).toBe(false);
    expect(result.message).toContain("Slack token not found");
  });

  it("succeeds with valid token", async () => {
    mockFetch.mockResolvedValue(mockSlackResponse({ ok: true, team: "My Team", user: "bot_user" }));

    const result = await testConnection(baseConfig);
    expect(result.success).toBe(true);
    expect(result.team).toBe("My Team");
    expect(result.user).toBe("bot_user");
  });

  it("fails on API error", async () => {
    mockFetch.mockResolvedValue(mockSlackResponse({ ok: false, error: "invalid_auth" }));

    const result = await testConnection(baseConfig);
    expect(result.success).toBe(false);
  });
});

describe("postMessage", () => {
  it("fails when not enabled", async () => {
    const result = await postMessage(
      { channel: "C12345", text: "Hello", mrkdwn: true },
      { ...baseConfig, enabled: false },
    );
    expect(result.success).toBe(false);
  });

  it("fails when channel is not configured", async () => {
    const noChannelConfig: SlackConfig = {
      enabled: true,
      tokenEnvRef: "AITEAM_SLACK_TOKEN",
      notifyOn: ["report_ready"],
    };
    const result = await postMessage({ channel: "", text: "Hello", mrkdwn: true }, noChannelConfig);
    expect(result.success).toBe(false);
  });

  it("posts message successfully", async () => {
    mockFetch.mockResolvedValue(mockSlackResponse({ ok: true, ts: "12345.67890" }));

    const result = await postMessage(
      { channel: "C12345", text: "Hello", mrkdwn: true },
      baseConfig,
    );
    expect(result.success).toBe(true);
    expect(result.ts).toBe("12345.67890");
  });

  it("fails on Slack API error (HTTP level)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ ok: false, error: "invalid_auth" }),
      text: () => Promise.resolve('{"ok":false,"error":"invalid_auth"}'),
    });

    const result = await postMessage(
      { channel: "C12345", text: "Hello", mrkdwn: true },
      baseConfig,
    );
    expect(result.success).toBe(false);
  });

  it("fails with channel_not_found (Slack JSON level)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: false, error: "channel_not_found" }),
      text: () => Promise.resolve('{"ok":false,"error":"channel_not_found"}'),
    });

    const result = await postMessage(
      { channel: "C12345", text: "Hello", mrkdwn: true },
      baseConfig,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("channel not found");
  });
});
