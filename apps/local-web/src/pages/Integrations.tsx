import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../lib/api.js";
import type {
  GitHubStatus,
  JiraStatus,
  JiraTestResult,
  SlackStatus,
  SlackTestResult,
} from "../lib/types.js";
import type { ReactElement } from "react";

interface IntegrationCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

function IntegrationCard({ title, description, children }: IntegrationCardProps): ReactElement {
  return (
    <div className="rounded-lg border bg-white p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}

function StatusIndicator({
  connected,
  notConfigured,
}: {
  connected: boolean;
  notConfigured?: boolean;
}): ReactElement {
  if (notConfigured) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
        <span className="h-2 w-2 rounded-full bg-gray-300" />
        Not Configured
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm ${connected ? "text-green-600" : "text-red-500"}`}
    >
      <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
      {connected ? "Connected" : "Not Connected"}
    </span>
  );
}

export function Integrations(): ReactElement {
  const [gitHubStatus, setGitHubStatus] = useState<GitHubStatus | null>(null);
  const [ghStatusLoading, setGhStatusLoading] = useState(false);
  const [ghTestResult, setGhTestResult] = useState<string | null>(null);
  const [ghLastTest, setGhLastTest] = useState<string | null>(null);

  const [jiraStatus, setJiraStatus] = useState<JiraStatus | null>(null);
  const [jiraTestResult, setJiraTestResult] = useState<JiraTestResult | null>(null);
  const [jiraStatusLoading, setJiraStatusLoading] = useState(false);
  const [jiraLastTest, setJiraLastTest] = useState<string | null>(null);

  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);
  const [slackTestResult, setSlackTestResult] = useState<SlackTestResult | null>(null);
  const [slackStatusLoading, setSlackStatusLoading] = useState(false);
  const [slackLastTest, setSlackLastTest] = useState<string | null>(null);

  const checkGitHubStatus = useCallback(async () => {
    setGhStatusLoading(true);
    setGhTestResult(null);
    try {
      const status = await api.getGitHubStatus();
      setGitHubStatus(status);
    } catch {
      setGitHubStatus(null);
    } finally {
      setGhStatusLoading(false);
    }
  }, []);

  const testGitHub = useCallback(async () => {
    setGhTestResult(null);
    try {
      const result = await api.testGitHubConnection();
      setGhTestResult(result.success ? `OK: ${result.message}` : `Failed: ${result.message}`);
      setGhLastTest(new Date().toLocaleString());
    } catch (e) {
      setGhTestResult(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
      setGhLastTest(new Date().toLocaleString());
    }
  }, []);

  const checkJiraStatus = useCallback(async () => {
    setJiraStatusLoading(true);
    setJiraTestResult(null);
    try {
      const status = await api.getJiraStatus();
      setJiraStatus(status);
    } catch {
      setJiraStatus(null);
    } finally {
      setJiraStatusLoading(false);
    }
  }, []);

  const testJira = useCallback(async () => {
    setJiraTestResult(null);
    try {
      const result = await api.testJiraConnection();
      setJiraTestResult(result);
      setJiraLastTest(new Date().toLocaleString());
    } catch (e) {
      setJiraTestResult({
        success: false,
        message: `Error: ${e instanceof Error ? e.message : "Unknown"}`,
      });
      setJiraLastTest(new Date().toLocaleString());
    }
  }, []);

  const checkSlackStatus = useCallback(async () => {
    setSlackStatusLoading(true);
    setSlackTestResult(null);
    try {
      const status = await api.getSlackStatus();
      setSlackStatus(status);
    } catch {
      setSlackStatus(null);
    } finally {
      setSlackStatusLoading(false);
    }
  }, []);

  const testSlack = useCallback(async () => {
    setSlackTestResult(null);
    try {
      const result = await api.testSlackConnection();
      setSlackTestResult(result);
      setSlackLastTest(new Date().toLocaleString());
    } catch (e) {
      setSlackTestResult({
        success: false,
        message: `Error: ${e instanceof Error ? e.message : "Unknown"}`,
      });
      setSlackLastTest(new Date().toLocaleString());
    }
  }, []);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-1">Configure optional service integrations.</p>
      </div>

      <IntegrationCard
        title="GitHub"
        description="GitHub integration using the gh CLI. No API tokens required."
      >
        <div className="flex items-center justify-between">
          <StatusIndicator
            connected={
              gitHubStatus ? gitHubStatus.ghCliAvailable && gitHubStatus.ghAuthenticated : false
            }
            notConfigured={!gitHubStatus}
          />
          <span className="text-xs text-gray-400">Mode: gh-cli</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void checkGitHubStatus()}
            disabled={ghStatusLoading}
            className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {ghStatusLoading ? "Checking..." : "Check Status"}
          </button>
          <button
            type="button"
            onClick={() => void testGitHub()}
            className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Test Connection
          </button>
        </div>
        {gitHubStatus && (
          <div className="text-sm space-y-1 text-gray-700">
            <p>
              <span className="font-medium">gh CLI:</span>{" "}
              {gitHubStatus.ghCliAvailable ? "Available" : "Not found"}
            </p>
            <p>
              <span className="font-medium">Authenticated:</span>{" "}
              {gitHubStatus.ghAuthenticated ? "Yes" : "No"}
            </p>
            {gitHubStatus.ghVersion && (
              <p>
                <span className="font-medium">Version:</span> {gitHubStatus.ghVersion}
              </p>
            )}
            {gitHubStatus.currentRepo && (
              <p>
                <span className="font-medium">Repo:</span> {gitHubStatus.currentRepo.owner}/
                {gitHubStatus.currentRepo.repo}
              </p>
            )}
          </div>
        )}
        {ghTestResult && (
          <div
            className={`text-sm px-3 py-2 rounded-md ${ghTestResult.startsWith("OK") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
          >
            {ghTestResult}
          </div>
        )}
        {ghLastTest && <p className="text-xs text-gray-400">Last tested: {ghLastTest}</p>}
      </IntegrationCard>

      <IntegrationCard
        title="Jira"
        description="Jira integration using API tokens. Configure in .ai-team/config.json."
      >
        <div className="flex items-center justify-between">
          <StatusIndicator
            connected={jiraStatus ? jiraStatus.enabled && jiraStatus.hasToken : false}
            notConfigured={!jiraStatus}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void checkJiraStatus()}
            disabled={jiraStatusLoading}
            className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {jiraStatusLoading ? "Checking..." : "Check Status"}
          </button>
          <button
            type="button"
            onClick={() => void testJira()}
            className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Test Connection
          </button>
        </div>
        {jiraStatus && (
          <div className="text-sm space-y-1 text-gray-700">
            <p>
              <span className="font-medium">Enabled:</span> {jiraStatus.enabled ? "Yes" : "No"}
            </p>
            {jiraStatus.siteUrl && (
              <p>
                <span className="font-medium">Site URL:</span> {jiraStatus.siteUrl}
              </p>
            )}
            {jiraStatus.projectKey && (
              <p>
                <span className="font-medium">Project Key:</span> {jiraStatus.projectKey}
              </p>
            )}
            <p>
              <span className="font-medium">Token:</span> {jiraStatus.hasToken ? "Set" : "Not set"}{" "}
              (env: AITEAM_JIRA_TOKEN)
            </p>
            <p>
              <span className="font-medium">Status:</span> {jiraStatus.overall}
            </p>
          </div>
        )}
        {jiraTestResult && (
          <div
            className={`text-sm px-3 py-2 rounded-md ${jiraTestResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
          >
            {jiraTestResult.message}
          </div>
        )}
        {jiraLastTest && <p className="text-xs text-gray-400">Last tested: {jiraLastTest}</p>}
      </IntegrationCard>

      <IntegrationCard
        title="Slack"
        description="Slack integration using a bot token. Token stored in AITEAM_SLACK_TOKEN environment variable."
      >
        <div className="flex items-center justify-between">
          <StatusIndicator
            connected={slackStatus ? slackStatus.enabled && slackStatus.hasToken : false}
            notConfigured={!slackStatus}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void checkSlackStatus()}
            disabled={slackStatusLoading}
            className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {slackStatusLoading ? "Checking..." : "Check Status"}
          </button>
          <button
            type="button"
            onClick={() => void testSlack()}
            className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Test Connection
          </button>
        </div>
        {slackStatus && (
          <div className="text-sm space-y-1 text-gray-700">
            <p>
              <span className="font-medium">Enabled:</span> {slackStatus.enabled ? "Yes" : "No"}
            </p>
            {slackStatus.channelId && (
              <p>
                <span className="font-medium">Channel ID:</span> {slackStatus.channelId}
              </p>
            )}
            <p>
              <span className="font-medium">Token:</span> {slackStatus.hasToken ? "Set" : "Not set"}{" "}
              (env: AITEAM_SLACK_TOKEN)
            </p>
            <p>
              <span className="font-medium">Status:</span> {slackStatus.overall}
            </p>
          </div>
        )}
        {slackTestResult && (
          <div
            className={`text-sm px-3 py-2 rounded-md ${slackTestResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
          >
            {slackTestResult.message}
          </div>
        )}
        {slackLastTest && <p className="text-xs text-gray-400">Last tested: {slackLastTest}</p>}
      </IntegrationCard>
    </div>
  );
}
