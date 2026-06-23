export interface SlackMessageInput {
  runTitle: string;
  runId: string;
  status: string;
  artifactSummary?: string | undefined;
  testResult?: string | undefined;
  reviewResult?: string | undefined;
  changedFiles?: string[] | undefined;
}

export function buildWorkflowStartedMessage(input: SlackMessageInput): string {
  return [
    `*🚀 AITeam Workflow Started*`,
    ``,
    `*Project:* ${input.runTitle}`,
    `*Status:* ${input.status}`,
    ``,
    `Workflow is now running. Results will be posted when complete.`,
    ``,
    `*Run ID:* \`${input.runId}\``,
    `*View in browser:* http://localhost:4317/runs/${input.runId}`,
  ].join("\n");
}

export function buildDocsGeneratedMessage(input: SlackMessageInput): string {
  return [
    `*📄 AITeam Documentation Generated*`,
    ``,
    `*Requirement:* ${input.runTitle}`,
    `*Status:* ${input.status}`,
    ``,
    `*Artifacts generated:*`,
    `• Clarified Requirement`,
    `• Business Rules`,
    `• Acceptance Criteria`,
    `• Technical Design`,
    `• API Design`,
    `• Database Design`,
    `• Task Breakdown`,
    `• Test Matrix`,
    ``,
    `*Run ID:* \`${input.runId}\``,
    `*View in browser:* http://localhost:4317/runs/${input.runId}`,
  ].join("\n");
}

export function buildCodeGeneratedMessage(input: SlackMessageInput): string {
  const lines: string[] = [
    `*💻 AITeam Code Generated*`,
    ``,
    `*Requirement:* ${input.runTitle}`,
    `*Status:* ${input.status}`,
    ``,
    `Code generation has completed.`,
    ``,
  ];

  if (input.changedFiles && input.changedFiles.length > 0) {
    lines.push(`*Changed files:*`);
    for (const file of input.changedFiles) {
      lines.push(`• \`${file}\``);
    }
    lines.push(``);
  }

  lines.push(
    `*Run ID:* \`${input.runId}\``,
    `*View in browser:* http://localhost:4317/runs/${input.runId}`,
  );

  return lines.join("\n");
}

export function buildTestResultMessage(input: SlackMessageInput): string {
  const icon = input.status === "TEST_PASSED" ? "✅" : "❌";
  const title = input.status === "TEST_PASSED" ? "Tests Passed" : "Tests Failed";

  const lines: string[] = [
    `*${icon} AITeam ${title}*`,
    ``,
    `*Requirement:* ${input.runTitle}`,
    `*Status:* ${input.status}`,
    ``,
  ];

  if (input.testResult) {
    lines.push(`*Test result:*`);
    lines.push(input.testResult);
    lines.push(``);
  }

  lines.push(
    `*Run ID:* \`${input.runId}\``,
    `*View in browser:* http://localhost:4317/runs/${input.runId}`,
  );

  return lines.join("\n");
}

export function buildReportReadyMessage(input: SlackMessageInput): string {
  const lines: string[] = [
    `*📋 AITeam Delivery Report Ready*`,
    ``,
    `*Requirement:* ${input.runTitle}`,
    `*Status:* ${input.status}`,
    ``,
    `*Artifacts generated:*`,
    `• Clarified Requirement`,
    `• Technical Design`,
    `• Task Breakdown`,
    `• Test Matrix`,
    `• Final Report`,
    ``,
  ];

  if (input.artifactSummary) {
    lines.push(input.artifactSummary);
    lines.push(``);
  }

  lines.push(
    `*Run ID:* \`${input.runId}\``,
    `*View in browser:* http://localhost:4317/runs/${input.runId}`,
  );

  return lines.join("\n");
}
