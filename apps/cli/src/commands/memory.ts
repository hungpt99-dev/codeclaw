import { access } from "node:fs/promises";
import { join } from "node:path";
import { getMemoryStatus, indexRuntimeMemory } from "@aiteam/memory";

export async function memoryStatusCommand(): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".ai-team");

  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .ai-team not found. Run 'aiteam init' first.");
    process.exit(1);
  }

  const status = await getMemoryStatus(process.cwd());

  console.log("\n🧠 Runtime Memory Status\n");

  if (!status.exists) {
    console.log("  Runtime memory: Missing");
    console.log("  Run 'aiteam init' to create runtime memory.\n");
    return;
  }

  const statusLabel =
    status.status === "ok" ? "OK" : status.status === "partial" ? "Partial" : "Missing";
  console.log(`  Runtime memory: ${statusLabel}`);
  console.log(`  Project memory files: ${String(status.projectMemoryCount)}`);
  console.log(`  Decision memory files: ${String(status.decisionMemoryCount)}`);
  console.log(`  Agent memory files: ${String(status.agentMemoryCount)}`);
  console.log(`  Indexed memory items: ${String(status.indexedItemCount)}`);
  console.log("");
}

export async function memoryIndexCommand(): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".ai-team");

  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .ai-team not found. Run 'aiteam init' first.");
    process.exit(1);
  }

  console.log("\n🔍 Indexing runtime memory...\n");

  const items = await indexRuntimeMemory(process.cwd());

  console.log(`  Indexed ${String(items.length)} memory items.\n`);
}
