import { execa } from "execa";

export async function isGhCliAvailable(): Promise<boolean> {
  try {
    await execa("which", ["gh"]);
    return true;
  } catch {
    return false;
  }
}

export async function isGhAuthenticated(): Promise<boolean> {
  try {
    const result = await execa("gh", ["auth", "status"], { stdio: "pipe" });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

export async function getCurrentRepo(): Promise<{ owner: string; repo: string } | null> {
  try {
    const result = await execa("gh", ["repo", "view", "--json", "name,owner"], {
      stdio: "pipe",
    });
    const parsed: { name: string; owner: { login: string } } = JSON.parse(result.stdout) as {
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
  options?: { base?: string; draft?: boolean },
): Promise<{ url: string; number: number }> {
  const args: string[] = ["pr", "create", "--title", title, "--body", body];
  if (options?.base !== undefined && options.base !== "") {
    args.push("--base", options.base);
  }
  if (options?.draft === true) {
    args.push("--draft");
  }
  const result = await execa("gh", args, { stdio: "pipe" });
  const url = result.stdout.trim();
  const prMatch = /#(\d+)/.exec(url);
  const number = prMatch ? Number(prMatch[1]) : 0;
  return { url, number };
}

export async function getGhPRStatus(): Promise<
  { state: string; title: string; url: string; number: number }[]
> {
  try {
    const result = await execa("gh", ["pr", "list", "--json", "state,title,url,number"], {
      stdio: "pipe",
    });
    const parsed: { state: string; title: string; url: string; number: number }[] = JSON.parse(
      result.stdout,
    ) as { state: string; title: string; url: string; number: number }[];
    return parsed;
  } catch {
    return [];
  }
}

export async function getGhPRView(
  prNumber: number,
): Promise<{ state: string; title: string; body: string; url: string } | null> {
  try {
    const result = await execa(
      "gh",
      ["pr", "view", String(prNumber), "--json", "state,title,body,url"],
      { stdio: "pipe" },
    );
    return JSON.parse(result.stdout) as { state: string; title: string; body: string; url: string };
  } catch {
    return null;
  }
}

export async function getCIRuns(): Promise<
  { workflow: string; status: string; conclusion: string }[]
> {
  try {
    const result = await execa(
      "gh",
      ["run", "list", "--limit", "5", "--json", "workflowName,status,conclusion"],
      {
        stdio: "pipe",
      },
    );
    const parsed: { workflowName: string; status: string; conclusion: string }[] = JSON.parse(
      result.stdout,
    ) as { workflowName: string; status: string; conclusion: string }[];
    return parsed.map((r) => ({
      workflow: r.workflowName,
      status: r.status,
      conclusion: r.conclusion,
    }));
  } catch {
    return [];
  }
}

export async function getGhCliVersion(): Promise<string | null> {
  try {
    const result = await execa("gh", ["--version"], { stdio: "pipe" });
    const firstLine = result.stdout.split("\n")[0];
    return firstLine ?? null;
  } catch {
    return null;
  }
}
