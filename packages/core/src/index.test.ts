import { describe, it, expect } from "vitest";
import { runWorkflow } from "./index.js";

describe("runWorkflow", () => {
  it("returns a run object with id, name, and createdAt", () => {
    const result = runWorkflow("World");
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name", "World");
    expect(result).toHaveProperty("createdAt");
    expect(result.id).toMatch(/^run_\d{8}_\d{6}_world$/);
  });
});
