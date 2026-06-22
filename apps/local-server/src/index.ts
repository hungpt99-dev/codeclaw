import { runDocsOnlyWorkflow } from "@aiteam/core";

async function start(): Promise<void> {
  console.log("Local server starting...");
  const result = await runDocsOnlyWorkflow({ requirement: "Server" });
  console.log(result);
}

void start();
