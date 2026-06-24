import { describe, it, expect } from "vitest";
import { createMockAgentBackend } from "./mockAgentBackend.js";

describe("mockAgentBackend", () => {
  it("has correct id and type", () => {
    const backend = createMockAgentBackend();
    expect(backend.id).toBe("mock");
    expect(backend.type).toBe("mock");
    expect(backend.name).toBe("Mock Agent Backend");
  });

  it("is always available", async () => {
    const backend = createMockAgentBackend();
    const availability = await backend.checkAvailability();
    expect(availability.available).toBe(true);
    expect(availability.version).toBe("mock-1.0.0");
  });

  it("generates deterministic content", async () => {
    const backend = createMockAgentBackend();
    const result = await backend.generate({
      agentId: "BA",
      agentName: "Business Analyst",
      systemPrompt: "You are a BA",
      userPrompt: "Analyze this requirement",
      context: { requirement: "Build a login page" },
      outputFormat: "markdown",
      timeoutMs: undefined,
    });

    expect(result.backendId).toBe("mock");
    expect(result.content).toContain("Business Analyst Output (Mock)");
    expect(result.content).toContain("mock response for agent");
    expect(result.usage).not.toBeUndefined();
    expect(result.usage?.totalTokens).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns usage information", async () => {
    const backend = createMockAgentBackend();
    const result = await backend.generate({
      agentId: "ARCHITECT",
      agentName: "Software Architect",
      systemPrompt: "Design the system",
      userPrompt: "Create architecture",
      context: {},
      outputFormat: "markdown",
      timeoutMs: undefined,
    });

    expect(result.usage).not.toBeUndefined();
    expect(result.usage?.inputTokens).toBeGreaterThan(0);
    expect(result.usage?.outputTokens).toBeGreaterThan(0);
  });
});
