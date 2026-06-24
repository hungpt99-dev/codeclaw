import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { configSchema } from "@aiteam/shared";
import type { ApprovalGate, RunStatus, SlackIntegrationConfig } from "@aiteam/shared";
import {
  runWorkflowWithGates,
  continueSemiAutoWorkflow,
  continueAfterRiskyFileApproval,
} from "@aiteam/core";
import {
  openDatabase,
  initializeSchema,
  createRunRepository,
  createApprovalRepository,
  createArtifactRepository,
} from "@aiteam/storage";
import { getMemoryStatus, addRunMemory } from "@aiteam/memory";

export async function resumeCommand(runId: string): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".ai-team");

  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .ai-team not found. Run 'aiteam init' first.");
    process.exit(1);
  }

  const db = openDatabase(join(aiTeamDir, "database.sqlite"));
  initializeSchema(db);

  const runRepo = createRunRepository(db);
  const run = runRepo.findById(runId);

  if (!run) {
    console.log(`❌ Run not found: ${runId}`);
    db.close();
    process.exit(1);
  }

  const approvalRepo = createApprovalRepository(db);

  let gateToCheck: ApprovalGate | undefined;
  if (run.status === "WAITING_FOR_SCOPE_APPROVAL") {
    gateToCheck = "SCOPE";
  } else if (run.status === "WAITING_FOR_REQUIREMENT_APPROVAL") {
    gateToCheck = "REQUIREMENT";
  } else if (run.status === "WAITING_FOR_PLAN_APPROVAL") {
    gateToCheck = "PLAN";
  } else if (run.status === "WAITING_FOR_CODE_APPROVAL") {
    gateToCheck = "CODE_GENERATION";
  } else if (run.status === "WAITING_FOR_RISKY_FILE_APPROVAL") {
    gateToCheck = "RISKY_FILE";
  } else {
    console.log(`⚠️ Run ${runId} is not waiting for approval. Current status: ${run.status}`);
    db.close();
    return;
  }

  const approval = approvalRepo.findByRunIdAndGate(runId, gateToCheck);
  if (approval?.status !== "APPROVED") {
    console.log(
      `⏸️ Gate ${gateToCheck} is not yet approved. Run: aiteam approve ${runId} --gate ${gateToCheck}`,
    );
    db.close();
    return;
  }

  const configPath = join(aiTeamDir, "config.json");
  const raw = await readFile(configPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  const config = configSchema.parse(parsed);

  const memoryStatus = await getMemoryStatus(process.cwd());
  const templateDir = join(aiTeamDir, "prompts");

  console.log(`▶️ Resuming run ${runId} after ${gateToCheck} approval...`);

  if (gateToCheck === "CODE_GENERATION") {
    const result = await continueSemiAutoWorkflow({
      runId,
      requirement: run.rawRequirement,
      projectRoot: process.cwd(),
      selectedAgent: "claude",
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
      safetyPolicy: {
        denyFiles: config.safety.denyFiles,
        warnFiles: config.safety.warnFiles,
        denyCommands: config.safety.denyCommands,
        maxIterations: config.safety.maxIterations,
        commandTimeoutSeconds: config.safety.commandTimeoutSeconds,
      },
      commandTimeoutSeconds: config.safety.commandTimeoutSeconds,
      slackConfig: config.integrations.slack as SlackIntegrationConfig,
      testCommands: config.commands,
      skipTests: false,
      maxIterations: config.safety.maxIterations,
    });

    if (memoryStatus.exists) {
      await addRunMemory(process.cwd(), runId, run.title, run.rawRequirement);
    }

    runRepo.updateStatus(runId, result.status as RunStatus);

    if (result.pendingGate) {
      console.log(`⏸️ ${result.pendingGate.summary}`);
      console.log(`   Run: aiteam approve ${runId} --gate ${result.pendingGate.gate}`);
    } else {
      console.log(`\n🚀 Run completed: ${runId}`);
      console.log(`   Status: ${result.status}`);
    }

    db.close();
    return;
  }

  if (gateToCheck === "RISKY_FILE") {
    const result = await continueAfterRiskyFileApproval({
      runId,
      requirement: run.rawRequirement,
      projectRoot: process.cwd(),
      selectedAgent: "claude",
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
      slackConfig: config.integrations.slack as SlackIntegrationConfig,
      testCommands: config.commands,
      skipTests: false,
      maxIterations: config.safety.maxIterations,
    });

    if (memoryStatus.exists) {
      await addRunMemory(process.cwd(), runId, run.title, run.rawRequirement);
    }

    runRepo.updateStatus(runId, result.status as RunStatus);

    if (result.pendingGate) {
      console.log(`⏸️ ${result.pendingGate.summary}`);
      console.log(`   Run: aiteam approve ${runId} --gate ${result.pendingGate.gate}`);
    } else {
      console.log(`\n🚀 Run completed: ${runId}`);
      console.log(`   Status: ${result.status}`);
    }

    db.close();
    return;
  }

  const workflowInput = {
    requirement: run.rawRequirement,
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
    approvedGate: gateToCheck,
  };

  const result = await runWorkflowWithGates(workflowInput);

  if (memoryStatus.exists) {
    await addRunMemory(process.cwd(), runId, run.title, run.rawRequirement);
  }

  const artifactRepo = createArtifactRepository(db);
  const artifactRecords = result.artifacts.map((artifactPath, index) => {
    const name = artifactPath.split("/").pop() ?? artifactPath;
    const format = name.endsWith(".json") ? "json" : "markdown";
    return artifactRepo.create({
      id: `${runId}_artifact_${String(index)}`,
      runId,
      type: "RAW_REQUIREMENT",
      name,
      path: artifactPath,
      format,
    });
  });

  runRepo.updateStatus(runId, result.status as RunStatus);

  if (result.pendingGate) {
    console.log(`⏸️ ${result.pendingGate.summary}`);
    console.log(`   Run: aiteam approve ${runId} --gate ${result.pendingGate.gate}`);
  } else {
    console.log(`\n🚀 Run completed: ${runId}`);
    console.log(`   Status: ${result.status}`);
    console.log(`\n📄 Artifacts:`);
    for (const artifact of artifactRecords) {
      console.log(`   - ${artifact.path}`);
    }
  }

  db.close();
}
