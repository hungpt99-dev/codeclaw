import { describe, it, expect } from "vitest";
import { greet } from "./index.js";

describe("greet", () => {
  it("returns a greeting string", () => {
    expect(greet("World")).toBe("Hello, World!");
  });
});
