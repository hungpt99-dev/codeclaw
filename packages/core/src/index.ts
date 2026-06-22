import { greet } from "@aiteam/shared";

export function runWorkflow(name: string): string {
  return greet(name);
}
