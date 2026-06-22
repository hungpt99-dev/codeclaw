import { describe, it, expect } from "vitest";
import { createAdapter } from "./index.js";

describe("createAdapter", () => {
  it("returns an adapter object", () => {
    const adapter = createAdapter();
    expect(adapter.connect()).toBe("connected");
  });
});
