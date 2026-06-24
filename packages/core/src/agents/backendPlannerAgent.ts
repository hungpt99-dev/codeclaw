import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@codeclaw/adapters";
import type { AiCliTool } from "@codeclaw/adapters";
import type { RepositoryAnalysis, AgentBackendConfig } from "@codeclaw/shared";
import { runWithAgentBackend } from "./agentBackendRunner.js";
import { parseBackendPlannerOutput } from "./parsers/backendPlannerOutputParser.js";

export interface BackendPlannerAgentInput {
  requirement: string;
  clarifiedRequirement: string;
  scopeDefinition?: string;
  mvpScope?: string;
  successCriteria?: string;
  repositoryAnalysis?: RepositoryAnalysis;
}

export interface BackendPlannerAgentOutput {
  serviceLayer: string;
  controllerDesign: string;
  middlewareChain: string;
  errorHandlingStrategy: string;
}

const SERVICE_LAYER_TEMPLATE = `# Service Layer

## Service Design for: {{requirement}}

### Service Architecture
| Service | Responsibility | Dependencies |
|---------|---------------|--------------|
| CoreService | Primary business logic orchestration | Repository, Validation |
| ProcessingService | Async processing, background jobs | Queue, Storage |
| NotificationService | Alerts, emails, push notifications | Template Renderer, Transport |
| AuditService | Logging, metrics, tracking | Repository, Time |

### Transaction Boundaries
- **CoreService.update()**: Single transaction wrapping all repository calls
- **ProcessingService.process()**: Each job step has independent transaction
- **Read operations**: No transaction, use read-committed isolation

### Business Logic Patterns
- **Validation**: Validate input at service boundary before processing
- **Authorization**: Check permissions before executing business logic
- **Idempotency**: Use idempotency keys for mutation endpoints
- **Retry**: Retry transient failures with exponential backoff

### Service Layer Conventions
- Services depend on interfaces (repositories, clients)
- Services throw typed domain exceptions
- Cross-cutting concerns handled by middleware (not services)
- Services are stateless and thread-safe
`;

const CONTROLLER_DESIGN_TEMPLATE = `# Controller Design

## Controller Design for: {{requirement}}

### Controller Endpoints
| Method | Path | Controller | Action |
|--------|------|------------|--------|
| POST | /api/v1/resource | ResourceController | create |
| GET | /api/v1/resource | ResourceController | list |
| GET | /api/v1/resource/:id | ResourceController | getById |
| PUT | /api/v1/resource/:id | ResourceController | update |
| DELETE | /api/v1/resource/:id | ResourceController | delete |

### Request Validation
- **Body**: JSON Schema / Class-validator / Zod validation
- **Params**: Path parameter validation (UUID format, positive int)
- **Query**: Pagination, sorting, filtering parameters
- **Headers**: Required headers (Content-Type, Authorization)

### Response Formatting
| Status | Condition |
|--------|-----------|
| 200 | Successful GET, PUT |
| 201 | Successful POST (with Location header) |
| 204 | Successful DELETE (no body) |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Resource not found |
| 409 | Conflict (duplicate, stale version) |
| 422 | Business rule violation |
| 500 | Internal server error |

### Controller Conventions
- Controllers are thin: delegate to services, format responses
- No business logic in controllers
- Use DTOs for request/response shapes
- Always return consistent envelope: { data, meta, error }
`;

const MIDDLEWARE_CHAIN_TEMPLATE = `# Middleware Chain

## Middleware for: {{requirement}}

### Middleware Pipeline (Execution Order)
1. **CORS** - Handle cross-origin requests
2. **Request Logging** - Log incoming request method, path, duration
3. **Rate Limiting** - Per-IP and per-user rate limits
4. **Authentication** - Verify JWT / API key, attach user to request
5. **Authorization** - Check role/permissions for the route
6. **Request Parsing** - Body parsing, query parsing, file uploads
7. **Validation** - Validate request against schema
8. **Route Handler** - Execute controller action
9. **Response Formatting** - Standardize response envelope
10. **Error Handler** - Catch all errors, return consistent error response

### Middleware Details
| Middleware | Responsibility | Config |
|------------|---------------|--------|
| cors() | Allow configured origins | AllowedOrigins: [...], methods: GET,POST,PUT,DELETE |
| requestLogger() | Log method, path, status, duration | Log level: info, exclude: health endpoints |
| rateLimiter() | Throttle excessive requests | Window: 60s, max: 100 requests per IP |
| authenticator() | Verify JWT from Authorization header | Secret from env, algorithms: [RS256] |
| authorizer() | Check user roles for route | RBAC with route-permission mapping |
| errorHandler() | Global error catch-all | Maps exceptions to HTTP status codes |

### Error Propagation
- Controllers may throw or return errors
- Async handler wrapper catches promise rejections
- Error middleware catches sync and async errors
- Unhandled errors return 500 with trace ID
`;

const ERROR_HANDLING_TEMPLATE = `# Error Handling Strategy

## Error Handling for: {{requirement}}

### Exception Hierarchy
\`\`\`
BaseAppException
├── ValidationException (400)
│   ├── MissingFieldError
│   ├── InvalidFormatError
│   └── BusinessRuleViolation (422)
├── AuthException (401)
│   ├── InvalidCredentialsError
│   └── TokenExpiredError
├── ForbiddenException (403)
├── NotFoundException (404)
├── ConflictException (409)
│   ├── DuplicateResourceError
│   └── StaleVersionError
└── InternalException (500)
    ├── DatabaseError
    └── ExternalServiceError
\`\`\`

### Error Response Format
\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ],
    "traceId": "uuid-for-correlation",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
\`\`\`

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Input validation failed |
| INVALID_CREDENTIALS | 401 | Bad username/password |
| TOKEN_EXPIRED | 401 | Auth token has expired |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource does not exist |
| CONFLICT | 409 | Resource state conflict |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Unexpected server error |

### Logging & Monitoring
- All errors logged with trace ID, stack trace, and context
- 4xx errors logged at WARN level
- 5xx errors logged at ERROR level with full stack
- Critical errors trigger alert notification
`;

const FALLBACK_TEMPLATES = `${SERVICE_LAYER_TEMPLATE}\n\n${CONTROLLER_DESIGN_TEMPLATE}\n\n${MIDDLEWARE_CHAIN_TEMPLATE}\n\n${ERROR_HANDLING_TEMPLATE}`;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "backend-planner-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

function buildProjectContext(input: BackendPlannerAgentInput): string {
  const analysis = input.repositoryAnalysis;
  if (!analysis) return "";

  const lines = [
    "## Project Context",
    `- Type: ${analysis.projectType ?? "Unknown"}`,
    `- Language: ${analysis.language ?? "Unknown"}`,
    `- Framework: ${analysis.framework ?? "Unknown"}`,
    `- Build Tool: ${analysis.buildTool ?? "Unknown"}`,
    `- Test Framework: ${analysis.testFramework ?? "Unknown"}`,
    `- Source: ${analysis.sourceDirs.join(", ") || "None"}`,
    `- Test: ${analysis.testDirs.join(", ") || "None"}`,
    `- Detected Patterns: ${analysis.detectedPatterns.join(", ") || "None"}`,
    "",
  ];
  return lines.join("\n");
}

function buildDesignWithContext(
  template: string,
  context: Record<string, string>,
  projectContext: string,
): string {
  if (!projectContext) return renderPrompt(template, context);
  return `${renderPrompt(template, context)}\n\n${projectContext}`;
}

export async function runBackendPlannerAgent(
  input: BackendPlannerAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
    agentBackendConfig?: AgentBackendConfig | undefined;
  },
): Promise<BackendPlannerAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATES;

  const projectContext = buildProjectContext(input);

  if (options?.agentBackendConfig) {
    const agentPrompt = `You are a Backend Architect. Design the backend architecture for the following requirement.

Requirement: ${input.requirement}
Clarified Requirement: ${input.clarifiedRequirement}
${projectContext}

Generate the following sections:
1. Service Layer - services, responsibilities, transaction boundaries
2. Controller Design - endpoints, validation, response formatting
3. Middleware Chain - pipeline, configuration, error propagation
4. Error Handling Strategy - exception hierarchy, error codes, logging`;

    const result = await runWithAgentBackend({
      config: options.agentBackendConfig,
      agentId: "BACKEND_PLANNER",
      agentName: "Backend Architect",
      systemPrompt:
        "You are a senior Backend Architect. Design comprehensive backend architecture including services, controllers, middleware, and error handling.",
      userPrompt: agentPrompt,
      context: { requirement: input.requirement, clarifiedRequirement: input.clarifiedRequirement },
      outputFormat: "markdown",
    });

    if (result?.content) {
      return parseBackendPlannerOutput(result.content, input.requirement);
    }
  }

  if (options?.aiTool) {
    const context = {
      requirement: input.requirement,
      clarifiedRequirement: input.clarifiedRequirement,
    };

    const result = await runAgent({
      role: "BACKEND_PLANNER",
      promptTemplate: projectContext ? `${template}\n\n${projectContext}` : template,
      context,
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parseBackendPlannerOutput(result.output, input.requirement);
    }
  }

  const context = { requirement: input.requirement };

  return {
    serviceLayer: buildDesignWithContext(SERVICE_LAYER_TEMPLATE, context, projectContext),
    controllerDesign: buildDesignWithContext(CONTROLLER_DESIGN_TEMPLATE, context, projectContext),
    middlewareChain: buildDesignWithContext(MIDDLEWARE_CHAIN_TEMPLATE, context, projectContext),
    errorHandlingStrategy: buildDesignWithContext(ERROR_HANDLING_TEMPLATE, context, projectContext),
  };
}
