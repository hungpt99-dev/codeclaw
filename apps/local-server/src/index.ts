import { runWorkflow } from "@aiteam/core";

function start(): void {
  console.log("Local server starting...");
  console.log(runWorkflow("Server"));
}

start();
