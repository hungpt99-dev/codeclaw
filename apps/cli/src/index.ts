import { runDocsOnlyWorkflow } from "@aiteam/core";

async function main(): Promise<void> {
  const result = await runDocsOnlyWorkflow({ requirement: "CLI" });
  console.log(result);
}

void main();
