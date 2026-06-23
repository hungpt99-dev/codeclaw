export interface JiraExportInput {
  title: string;
  requirementSummary: string;
  taskBreakdown: string;
  acceptanceCriteria: string;
  technicalDesign?: string | undefined;
}

export function generateJiraReadyMarkdown(input: JiraExportInput): string {
  const lines: string[] = [];

  lines.push(`*Epic: ${input.title}*`);
  lines.push("");

  const stories = extractStoriesFromBreakdown(input.taskBreakdown, input.requirementSummary);
  for (const story of stories) {
    lines.push(`*Story: ${story.title}*`);
    lines.push("*Description:*");
    lines.push(story.description);
    lines.push("");
    lines.push("*Acceptance Criteria:*");
    const acLines = extractAcceptanceCriteriaItems(input.acceptanceCriteria);
    for (const ac of acLines) {
      lines.push(`- ${ac}`);
    }
    lines.push("");
    lines.push("*Subtasks:*");
    for (const task of story.tasks) {
      lines.push(`- [ ] ${task.id}: ${task.title}`);
    }
    lines.push("");
    lines.push("*Definition of Done:*");
    lines.push("- Code reviewed");
    lines.push("- Tests pass");
    lines.push("- Acceptance criteria met");
    lines.push("");
  }

  return lines.join("\n");
}

interface StoryInfo {
  title: string;
  description: string;
  tasks: { id: string; title: string }[];
}

function extractStoriesFromBreakdown(breakdown: string, requirementSummary: string): StoryInfo[] {
  const stories: StoryInfo[] = [];

  const phaseRegex = /###?\s+(Phase\s+\d+|Core|Foundation|Integration|Quality)[^]*?(?=###?\s+|$)/gi;
  const phaseMatches: string[] = [];
  let pm: RegExpExecArray | null;
  while ((pm = phaseRegex.exec(breakdown)) !== null) {
    if (pm[0]) phaseMatches.push(pm[0]);
  }

  for (let i = 0; i < phaseMatches.length; i++) {
    const phase = phaseMatches[i] ?? "";
    const titleMatch = /###?\s+(.+)/.exec(phase);
    const phaseTitle = titleMatch?.[1]?.trim() ?? `Phase ${String(i + 1)}`;

    const tasks: { id: string; title: string }[] = [];
    const taskRegex = /\|\s*(\S+)\s*\|\s*([^|]+?)\s*\|/g;
    let taskMatch: RegExpExecArray | null;
    while ((taskMatch = taskRegex.exec(phase)) !== null) {
      const id = taskMatch[1]?.trim();
      const title = taskMatch[2]?.trim();
      if (id && title && !["Task ID", "---"].includes(id)) {
        tasks.push({ id, title });
      }
    }

    stories.push({
      title: `${phaseTitle} - ${requirementSummary.slice(0, 60)}`,
      description: `Implement ${phaseTitle.toLowerCase()} for: ${requirementSummary}`,
      tasks,
    });
  }

  if (stories.length === 0) {
    stories.push({
      title: requirementSummary.slice(0, 80),
      description: requirementSummary,
      tasks: extractTaskIds(breakdown),
    });
  }

  return stories;
}

function extractAcceptanceCriteriaItems(acContent: string): string[] {
  const lines = acContent.split("\n");
  const items: string[] = [];
  let acIndex = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^- \[?.*?\]?\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
      items.push(
        `AC-${String(acIndex).padStart(3, "0")}: ${trimmed.replace(/^- \[.?\]?\s*|^\d+[.)]\s*/, "")}`,
      );
      acIndex++;
    }
  }

  if (items.length === 0) {
    const acLines = lines.filter(
      (l) => l.trim().length > 0 && !l.startsWith("#") && !l.startsWith("---"),
    );
    for (const line of acLines) {
      items.push(`AC-${String(acIndex).padStart(3, "0")}: ${line.trim()}`);
      acIndex++;
    }
  }

  return items;
}

function extractTaskIds(breakdown: string): { id: string; title: string }[] {
  const tasks: { id: string; title: string }[] = [];
  const taskRegex = /\|\s*(\S+)\s*\|\s*([^|]+?)\s*\|/g;
  let match: RegExpExecArray | null;
  while ((match = taskRegex.exec(breakdown)) !== null) {
    const id = match[1]?.trim();
    const title = match[2]?.trim();
    if (id && title && !["Task ID", "---"].includes(id)) {
      tasks.push({ id, title });
    }
  }
  return tasks;
}
