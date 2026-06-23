interface PmParsedOutput {
  taskBreakdownMd: string;
  taskBreakdownJson: string;
}

function extractSection(raw: string, heading: string): string {
  const regex = new RegExp(
    `(?:^|\\n)##?\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n##?\\s|$)`,
    "i",
  );
  const match = raw.match(regex);
  return match?.[1]?.trim() ?? "";
}

export function parsePmOutput(raw: string, requirement: string): PmParsedOutput {
  const breakdown = extractSection(raw, "Task Breakdown") || raw;

  const taskBreakdownMd = `# Task Breakdown\n\n${breakdown}`;

  const taskBreakdownJson = JSON.stringify(
    {
      epic: "Implementation",
      requirement,
      phases: [
        {
          name: "Tasks",
          tasks: [
            {
              id: "T-001",
              title: "Implement requirement",
              estimate: "8h",
              priority: "High",
              dependencies: [],
            },
          ],
        },
      ],
      totalTasks: 1,
      totalEstimatedHours: 8,
      criticalPath: ["T-001"],
    },
    null,
    2,
  );

  return { taskBreakdownMd, taskBreakdownJson };
}
