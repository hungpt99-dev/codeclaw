import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Integrations } from "./Integrations.js";

vi.mock("../lib/api.js", () => ({
  api: {
    getGitHubStatus: vi.fn().mockResolvedValue({
      ghCliAvailable: true,
      ghAuthenticated: true,
      ghVersion: "2.45.0",
      currentRepo: { owner: "test", repo: "test-repo" },
      configValid: true,
      overall: "connected",
    }),
    testGitHubConnection: vi.fn().mockResolvedValue({ success: true, message: "Connected" }),
    getJiraStatus: vi.fn().mockResolvedValue({
      configured: true,
      enabled: true,
      hasToken: true,
      siteUrl: "https://test.atlassian.net",
      projectKey: "TEST",
      overall: "connected",
    }),
    testJiraConnection: vi.fn().mockResolvedValue({ success: true, message: "Connected" }),
    getSlackStatus: vi.fn().mockResolvedValue({
      configured: true,
      enabled: true,
      hasToken: true,
      channelId: "C12345",
      overall: "connected",
    }),
    testSlackConnection: vi.fn().mockResolvedValue({ success: true, message: "Connected" }),
  },
}));

describe("Integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all integration cards", () => {
    render(<Integrations />);
    expect(screen.getByText("Integrations")).toBeDefined();
    expect(screen.getByText("GitHub")).toBeDefined();
    expect(screen.getByText("Jira")).toBeDefined();
    expect(screen.getByText("Slack")).toBeDefined();
  });

  it("displays status check buttons", () => {
    render(<Integrations />);
    const checkButtons = screen.getAllByText("Check Status");
    expect(checkButtons.length).toBe(3);
  });

  it("displays test connection buttons", () => {
    render(<Integrations />);
    const testButtons = screen.getAllByText("Test Connection");
    expect(testButtons.length).toBe(3);
  });
});
