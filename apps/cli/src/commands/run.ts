import { executeRun, setRunExecutionStorage } from "@codeclaw/core";
import { openDatabase, initializeSchema, createRunRepository, createArtifactRepository, createApprovalRepository, createWorkflowTemplateRepository } from "@codeclaw/storage";

interface RunOptions {
  title?: string;
  mode?: string;
  outputLanguage?: string;
  json?: boolean;
  approve?: boolean;
  agent?: string;
  timeout?: string;
  project?: string;
  workflowTemplate?: string;
}

export async function runCommand(requirement: string, options: RunOptions): Promise<void> {
  setRunExecutionStorage({
    openDatabase: (p: string) => openDatabase(p),
    initializeSchema: (d: unknown) => initializeSchema(d as any),
    createRunRepository: (d: unknown) => createRunRepository(d as any) as any,
    createArtifactRepository: (d: unknown) => createArtifactRepository(d as any) as any,
    createApprovalRepository: (d: unknown) => createApprovalRepository(d as any) as any,
    createWorkflowTemplateRepository: (d: unknown) => createWorkflowTemplateRepository(d as any) as any,
  } as any);
  const result = await executeRun({
    projectId: options.project,
    requirement,
    workflowMode: options.mode ?? "docs-only",
    workflowTemplateId: options.workflowTemplate,
    title: options.title,
    outputLanguage: options.outputLanguage ?? "English",
    agent: options.agent,
    approve: options.approve,
    timeout: options.timeout ? Number(options.timeout) : undefined,
  } as any);

  if (result.error) {
    console.log(`\n❌ Run failed: ${result.error}\n`);
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.workflowTemplateId) {
    console.log(`\n🚀 Run completed: ${result.runId}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Template: ${result.workflowTemplateId}`);
    console.log(`   Project: ${result.projectId ?? "default"}`);
  } else {
    console.log(`\n🚀 Run completed: ${result.runId}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Project: ${result.projectId ?? "default"}`);
  }

  if (result.artifacts.length > 0) {
    console.log(`\n📄 Artifacts:`);
    for (const artifactPath of result.artifacts) {
      console.log(`   - ${artifactPath}`);
    }
  }
  console.log("");
}
