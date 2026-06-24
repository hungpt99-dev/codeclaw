import { readFile } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { createRunId, nowIso, configSchema } from "@codeclaw/shared";
import type { Config, RunMode, RunStatus } from "@codeclaw/shared";
import {
  runDocsOnlyWorkflow,
  runAssistedWorkflow,
  runSemiAutoWorkflow,
  runWorkflowWithGates,
  defaultSafetyPolicy,
  resolveProjectDir,
} from "@codeclaw/core";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createArtifactRepository,
  createApprovalRepository,
} from "@codeclaw/storage";
import type { ArtifactType, AiAdapterName, ApprovalGate } from "@codeclaw/shared";
import { getMemoryStatus, addRunMemory } from "@codeclaw/memory";

interface RunOptions {
  title?: string;
  mode?: string;
  outputLanguage?: string;
  json?: boolean;
  approve?: boolean;
  agent?: string;
  timeout?: string;
  project?: string;
}

function inferArtifactType(filePath: string): ArtifactType {
  const name = basename(filePath, extname(filePath));
  const typeMap: Record<string, ArtifactType> = {
    input: "RAW_REQUIREMENT",
    "clarified-requirement": "CLARIFIED_REQUIREMENT",
    "business-rules": "BUSINESS_RULES",
    "acceptance-criteria": "ACCEPTANCE_CRITERIA",
    "open-questions": "OPEN_QUESTIONS",
    assumptions: "ASSUMPTIONS",
    "technical-design": "TECHNICAL_DESIGN",
    "api-design": "API_DESIGN",
    "db-design": "DB_DESIGN",
    "task-breakdown": "TASK_BREAKDOWN",
    "jira-ready-tasks": "JIRA_READY_TASKS",
    "test-matrix": "TEST_MATRIX",
    "coding-plan": "CODING_PLAN",
    "implementation-prompt": "IMPLEMENTATION_PROMPT",
    "final-report": "FINAL_REPORT",
  };
  return typeMap[name] ?? "RAW_REQUIREMENT";
}

function inferFormat(filePath: string): string {
  const ext = extname(filePath);
  if (ext === ".json") return "json";
  return "markdown";
}

async function loadConfig(aiTeamDir: string): Promise<Config> {
  const configPath = join(aiTeamDir, "config.json");
  const raw = await readFile(configPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  return configSchema.parse(parsed);
}

export async function runCommand(requirement: string, options: RunOptions): Promise<void> {
  let aiTeamDir: string;

  try {
    const resolved = await resolveProjectDir(options.project);
    aiTeamDir = resolved.projectDir;
  } catch (err) {
    console.log(`❌ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const config = await loadConfig(aiTeamDir);
  const runId = createRunId(requirement);
  const title = options.title ?? requirement.slice(0, 80);

  const db = openDatabase(join(aiTeamDir, "database.sqlite"));
  initializeSchema(db);

  const runRepo = createRunRepository(db);
  const artifactRepo = createArtifactRepository(db);
  const approvalRepo = createApprovalRepository(db);

  const mode = (options.mode ?? config.workflow.defaultMode) as RunMode;

  runRepo.create({
    id: runId,
    title,
    rawRequirement: requirement,
    mode,
    outputLanguage: options.outputLanguage ?? "English",
  });

  const memoryStatus = await getMemoryStatus(process.cwd());

  const templateDir = join(aiTeamDir, "prompts");

  const gatesEnabled =
    config.workflow.requireRequirementApproval || config.workflow.requirePlanApproval;

  if (gatesEnabled && !options.approve) {
    const workflowInput = {
      requirement,
      projectRoot: process.cwd(),
      memoryContext: memoryStatus.exists
        ? {
            projectMemoryCount: memoryStatus.projectMemoryCount,
            decisionMemoryCount: memoryStatus.decisionMemoryCount,
            agentMemoryCount: memoryStatus.agentMemoryCount,
          }
        : undefined,
      templateDir,
      agentMapping: config.agents,
      cliConfigs: config.cli,
      agentBackendConfig: config.agentBackend,
    };

    const result = await runWorkflowWithGates(workflowInput);

    for (let i = 0; i < result.artifacts.length; i++) {
      const artifactPath = result.artifacts[i];
      if (!artifactPath) continue;
      const type = inferArtifactType(artifactPath);
      const format = inferFormat(artifactPath);
      const name = basename(artifactPath);
      artifactRepo.create({
        id: `${runId}_artifact_${String(i)}`,
        runId,
        type,
        name,
        path: artifactPath,
        format,
      });
    }

    runRepo.updateStatus(runId, result.status as RunStatus);

    if (result.pendingGate) {
      const gate = result.pendingGate.gate;
      const approvalId = `${runId}_approval_${gate.toLowerCase()}`;
      approvalRepo.create({
        id: approvalId,
        runId,
        gate,
        status: "PENDING",
      });

      console.log(`\n⏸️ ${result.pendingGate.summary}`);
      console.log(`   Gate: ${gate}`);
      console.log(`   Artifacts created: ${String(result.artifacts.length)}`);
      console.log(`\n   To approve:  codeclaw approve ${runId} --gate ${gate}`);
      console.log(`   To reject:   codeclaw reject ${runId} --gate ${gate}`);
      console.log(`   To resume:   codeclaw resume ${runId}`);
      console.log(`   Or open UI:  codeclaw ui`);
      console.log("");
    } else {
      console.log(`\n🚀 Run completed: ${runId}`);
      console.log(`   Status: ${result.status}`);
      console.log(`\n📄 Artifacts:`);
      for (const artifactPath of result.artifacts) {
        console.log(`   - ${artifactPath}`);
      }
      console.log("");
    }

    db.close();
    return;
  }

  const workflowInput = {
    requirement,
    projectRoot: process.cwd(),
    memoryContext: memoryStatus.exists
      ? {
          projectMemoryCount: memoryStatus.projectMemoryCount,
          decisionMemoryCount: memoryStatus.decisionMemoryCount,
          agentMemoryCount: memoryStatus.agentMemoryCount,
        }
      : undefined,
    templateDir,
    agentMapping: config.agents,
    cliConfigs: config.cli,
    agentBackendConfig: config.agentBackend,
  };

  let result: {
    runId: string;
    status: string;
    artifacts: string[];
    createdAt: string;
    completedAt: string;
    pendingGate?: {
      gate: string;
      status: string;
      summary: string;
      artifacts: string[];
    };
  };

  if (mode === "semi-auto") {
    const selectedAgent = (options.agent ?? config.agents.defaultDeveloper) as AiAdapterName;

    const semiInput = {
      ...workflowInput,
      selectedAgent,
      approvalConfig: {
        requireCodeApproval: !options.approve,
      },
      safetyPolicy: {
        ...defaultSafetyPolicy(),
        denyFiles: config.safety.denyFiles,
        warnFiles: config.safety.warnFiles,
        denyCommands: config.safety.denyCommands,
        maxIterations: config.safety.maxIterations,
        commandTimeoutSeconds: options.timeout
          ? Number(options.timeout)
          : config.safety.commandTimeoutSeconds,
      },
      commandTimeoutSeconds: options.timeout
        ? Number(options.timeout)
        : config.safety.commandTimeoutSeconds,
    };

    result = await runSemiAutoWorkflow(semiInput);
  } else if (mode === "assisted") {
    result = await runAssistedWorkflow(workflowInput);
  } else {
    result = await runDocsOnlyWorkflow(workflowInput);
  }

  if (memoryStatus.exists) {
    await addRunMemory(process.cwd(), runId, title, requirement);
  }

  const artifactRecords = result.artifacts.map((artifactPath, index) => {
    const type = inferArtifactType(artifactPath);
    const format = inferFormat(artifactPath);
    const name = basename(artifactPath);
    return artifactRepo.create({
      id: `${runId}_artifact_${String(index)}`,
      runId,
      type,
      name,
      path: artifactPath,
      format,
    });
  });

  runRepo.updateStatus(runId, result.status as RunStatus);

  if (result.pendingGate) {
    const gate = result.pendingGate.gate as ApprovalGate;
    const approvalId = `${runId}_approval_${gate.toLowerCase()}`;
    approvalRepo.create({
      id: approvalId,
      runId,
      gate,
      status: "PENDING",
    });

    console.log(`\n⏸️ ${result.pendingGate.summary}`);
    console.log(`   Gate: ${gate}`);
    console.log(`   Artifacts created: ${String(result.artifacts.length)}`);
    console.log(`\n   To approve:  codeclaw approve ${runId} --gate ${gate}`);
    console.log(`   To reject:   codeclaw reject ${runId} --gate ${gate}`);
    console.log(`   To resume:   codeclaw resume ${runId}`);
    console.log(`   Or open UI:  codeclaw ui`);
    console.log("");
  } else if (options.json) {
    console.log(
      JSON.stringify(
        {
          runId,
          status: result.status,
          artifacts: artifactRecords.map((a) => ({
            type: a.type,
            name: a.name,
            path: a.path,
          })),
          createdAt: result.createdAt,
          completedAt: nowIso(),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`\n🚀 Run completed: ${runId}`);
    console.log(`   Status: ${result.status}`);
    console.log(`\n📄 Artifacts:`);
    for (const artifact of artifactRecords) {
      console.log(`   - [${artifact.type}] ${artifact.path}`);
    }
    console.log("");
  }

  db.close();
}
