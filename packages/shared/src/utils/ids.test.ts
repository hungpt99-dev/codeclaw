import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRunId, slugify } from "./ids.js";

describe("slugify", () => {
  it("lowercases and replaces non-alphanumeric with underscores", () => {
    expect(slugify("Hello World")).toBe("hello_world");
  });

  it("replaces multiple non-alphanumeric chars with single underscore", () => {
    expect(slugify("Hello!!!   World")).toBe("hello_world");
  });

  it("trims leading and trailing underscores", () => {
    expect(slugify("  hello  ")).toBe("hello");
  });

  it("truncates to 40 characters", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(40);
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles special characters", () => {
    expect(slugify("user@login#system")).toBe("user_login_system");
  });
});

describe("createRunId", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T14:30:45.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates a run ID with correct format", () => {
    const id = createRunId("Build a login page");
    expect(id).toBe("run_20250615_143045_build_a_login_page");
  });

  it("includes slugified requirement", () => {
    const id = createRunId("Hello World");
    expect(id).toContain("hello_world");
  });

  it("starts with run_ prefix", () => {
    const id = createRunId("test");
    expect(id.startsWith("run_")).toBe(true);
  });

  it("generates unique IDs for different timestamps", () => {
    const id1 = createRunId("test");
    vi.advanceTimersByTime(1000);
    const id2 = createRunId("test");
    expect(id1).not.toBe(id2);
  });
});
