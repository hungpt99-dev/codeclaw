import { describe, it, expect } from "vitest";
import { runWorkflow } from "./index.js";

describe("runWorkflow", () => {
  it("returns a greeting", () => {
    expect(runWorkflow("World")).toBe("Hello, World!");
  });
});
