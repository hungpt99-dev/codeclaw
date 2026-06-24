import { NativeRunnerClient } from "@codeclaw/native-runner";

function createRunner(): NativeRunnerClient {
  return new NativeRunnerClient();
}

async function runGitHubCli(
  args: string[],
  cwd?: string,
): Promise<{ stdout: string; exitCode: number }> {
  const runner = createRunner();
  const response = await runner.runCommand({
    command: "gh",
    args,
    cwd: cwd ?? process.cwd(),
    timeoutMs: 15000,
    env: undefined,
    policy: undefined,
    captureStdout: true,
    captureStderr: true,
    redactSecrets: false,
  });

  if (!response.success && response.error?.code === "RUNNER_NOT_FOUND") {
    throw new Error(
      "CodeClaw native runner is required for command execution. Install or build codeclaw-runner.",
    );
  }

  return { stdout: response.stdout ?? "", exitCode: response.exitCode ?? 1 };
}

export async function isGhCliAvailable(): Promise<boolean> {
  try {
    const { exitCode } = await runGitHubCli(["--version"]);
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function isGhAuthenticated(): Promise<boolean> {
  try {
    const { exitCode } = await runGitHubCli(["auth", "status"]);
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function getCurrentRepo(): Promise<{ owner: string; repo: string } | null> {
  try {
    const { stdout } = await runGitHubCli(["repo", "view", "--json", "name,owner"]);
    const parsed: { name: string; owner: { login: string } } = JSON.parse(stdout) as {
      name: string;
      owner: { login: string };
    };
    return { owner: parsed.owner.login, repo: parsed.name };
  } catch {
    return null;
  }
}

export async function createGhPR(
  title: string,
  body: string,
  baseBranch: string,
  headBranch: string,
): Promise<{ url: string; number: number } | null> {
  try {
    const { stdout } = await runGitHubCli([
      "pr",
      "create",
      "--title",
      title,
      "--body",
      body,
      "--base",
      baseBranch,
      "--head",
      headBranch,
      "--json",
      "url,number",
    ]);
    const parsed: { url: string; number: number } = JSON.parse(stdout) as {
      url: string;
      number: number;
    };
    return parsed;
  } catch {
    return null;
  }
}

export async function getGhPRStatus(
  _owner: string,
  _repo: string,
): Promise<{ state: string; title: string; url: string; number: number }[]> {
  try {
    const { stdout } = await runGitHubCli(["pr", "list", "--json", "state,title,url,number"]);
    const parsed: { state: string; title: string; url: string; number: number }[] = JSON.parse(
      stdout,
    ) as { state: string; title: string; url: string; number: number }[];
    return parsed;
  } catch {
    return [];
  }
}

export async function getGhPRView(
  prNumber: number,
): Promise<{ title: string; body: string; state: string; url: string } | null> {
  try {
    const { stdout } = await runGitHubCli([
      "pr",
      "view",
      String(prNumber),
      "--json",
      "title,body,state,url",
    ]);
    const parsed: { title: string; body: string; state: string; url: string } = JSON.parse(
      stdout,
    ) as { title: string; body: string; state: string; url: string };
    return parsed;
  } catch {
    return null;
  }
}

export async function getCIRuns(
  _owner: string,
  _repo: string,
  branch?: string,
): Promise<
  {
    name: string;
    status: string;
    conclusion: string | null;
    url: string;
  }[]
> {
  try {
    const args = ["run", "list", "--json", "name,status,conclusion,url"];
    if (branch) {
      args.push("--branch", branch);
    }
    const { stdout } = await runGitHubCli(args);
    const parsed: { name: string; status: string; conclusion: string | null; url: string }[] =
      JSON.parse(stdout) as {
        name: string;
        status: string;
        conclusion: string | null;
        url: string;
      }[];
    return parsed;
  } catch {
    return [];
  }
}

export async function getGhCliVersion(): Promise<string | null> {
  try {
    const { stdout } = await runGitHubCli(["--version"]);
    return stdout.trim().split("\n")[0] ?? null;
  } catch {
    return null;
  }
}
