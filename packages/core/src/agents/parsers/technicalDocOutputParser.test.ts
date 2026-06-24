import { describe, it, expect } from "vitest";
import { parseTechnicalDocOutput } from "./technicalDocOutputParser.js";

describe("parseTechnicalDocOutput", () => {
  it("parses all sections from structured output", () => {
    const raw = `## API Reference

Base URL: https://api.example.com/v1

### Authentication
Use bearer tokens.

## Setup Guide

### Prerequisites
Node.js 18+

## Technical Reference

### Architecture
Layered architecture.

## Operations Guide

### Deployment
Run pnpm build.
`;
    const result = parseTechnicalDocOutput(raw, "test requirement");
    expect(result.apiReference).toContain("https://api.example.com");
    expect(result.setupGuide).toContain("Node.js 18");
    expect(result.technicalReference).toContain("Layered architecture");
    expect(result.operationsGuide).toContain("pnpm build");
  });

  it("uses fallback content when no sections found", () => {
    const raw = "Some unstructured documentation text";
    const result = parseTechnicalDocOutput(raw, "test requirement");
    expect(result.apiReference).toContain("test requirement");
    expect(result.apiReference).not.toBe(raw);
    expect(result.setupGuide).toBeTruthy();
    expect(result.technicalReference).toBeTruthy();
    expect(result.operationsGuide).toBeTruthy();
  });

  it("handles empty input gracefully", () => {
    const result = parseTechnicalDocOutput("", "test requirement");
    expect(result.apiReference).toContain("test requirement");
    expect(result.setupGuide).toContain("test requirement");
    expect(result.technicalReference).toContain("test requirement");
    expect(result.operationsGuide).toContain("test requirement");
  });

  it("provides fallback content for missing sections", () => {
    const raw = "## API Reference\n\nOnly this section exists.\n";
    const result = parseTechnicalDocOutput(raw, "test requirement");
    expect(result.apiReference).toContain("Only this section exists");
    expect(result.setupGuide).toContain("Setup Guide");
    expect(result.setupGuide).toContain("test requirement");
  });

  it("handles sections with extra whitespace and newlines", () => {
    const raw = `## API Reference

Endpoint: GET /api/users
Response: 200 OK


## Setup Guide

Step 1: Install


`;
    const result = parseTechnicalDocOutput(raw, "test requirement");
    expect(result.apiReference).toContain("GET /api/users");
    expect(result.setupGuide).toContain("Step 1: Install");
    expect(result.technicalReference).toBeTruthy();
  });

  it("extracts content between consecutive sections correctly", () => {
    const raw = `## API Reference

Content A

## Setup Guide

Content B

## Technical Reference

Content C

## Operations Guide

Content D
`;
    const result = parseTechnicalDocOutput(raw, "test requirement");
    expect(result.apiReference).toBe("Content A");
    expect(result.setupGuide).toBe("Content B");
    expect(result.technicalReference).toBe("Content C");
    expect(result.operationsGuide).toBe("Content D");
  });
});
