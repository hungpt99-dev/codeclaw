import { describe, it, expect } from "vitest";
import { parseBackendPlannerOutput } from "./backendPlannerOutputParser.js";

describe("parseBackendPlannerOutput", () => {
  it("parses sections from structured output", () => {
    const raw = `## Service Layer
CoreService, AuditService, NotificationService

## Controller Design
POST /api/v1/resource, GET /api/v1/resource

## Middleware Chain
CORS, Auth, Logging, Error Handler

## Error Handling Strategy
ValidationException, NotFoundException, InternalException`;

    const result = parseBackendPlannerOutput(raw, "test requirement");
    expect(result.serviceLayer).toContain("CoreService");
    expect(result.controllerDesign).toContain("/api/v1/resource");
    expect(result.middlewareChain).toContain("Auth");
    expect(result.errorHandlingStrategy).toContain("NotFoundException");
  });

  it("provides fallback for missing sections", () => {
    const result = parseBackendPlannerOutput("Some random text", "test req");
    expect(result.serviceLayer).toBeTruthy();
    expect(result.controllerDesign).toBeTruthy();
    expect(result.middlewareChain).toBeTruthy();
    expect(result.errorHandlingStrategy).toBeTruthy();
  });
});
