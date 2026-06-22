import { describe, it, expect } from "vitest";
import { createStore } from "./index.js";

describe("createStore", () => {
  it("returns a store object", () => {
    const store = createStore();
    expect(store.get()).toBe("store");
  });
});
