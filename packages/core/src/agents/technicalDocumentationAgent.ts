import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@codeclaw/adapters";
import type { AiCliTool } from "@codeclaw/adapters";
import type { AgentBackendConfig } from "@codeclaw/shared";
import { runWithAgentBackend } from "./agentBackendRunner.js";
import { parseTechnicalDocOutput } from "./parsers/technicalDocOutputParser.js";

export interface TechnicalDocumentationAgentInput {
  requirement: string;
  clarifiedRequirement: string;
  acceptanceCriteria: string;
  technicalDesign: string;
  apiDesign: string;
  dbDesign: string;
  taskBreakdownMd: string;
  testMatrixMd: string;
  traceabilitySection?: string | undefined;
  integrationPlanSection?: string | undefined;
  releasePlanSection?: string | undefined;
}

export interface TechnicalDocumentationAgentOutput {
  apiReference: string;
  setupGuide: string;
  technicalReference: string;
  operationsGuide: string;
}

const API_REFERENCE_TEMPLATE = `# API Reference

## Project: {{requirement}}

**Generated**: {{generatedAt}}

---

## Overview

This document describes the API surface for the project. All endpoints follow REST conventions.

---

## Authentication

API authentication is handled via bearer tokens. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-token>
\`\`\`

For development, use placeholder credentials. Never commit real tokens.

---

## Endpoints

{{#if apiDesign}}
{{apiDesign}}
{{/if}}

### Common Response Formats

All API responses follow a consistent envelope:

\`\`\`json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_123"
  }
}
\`\`\`

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource does not exist |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Rate Limiting

API requests are rate-limited. Rate limit headers are returned in all responses:

- \`X-RateLimit-Limit\`: Maximum requests per window
- \`X-RateLimit-Remaining\`: Remaining requests in current window
- \`X-RateLimit-Reset\`: Unix timestamp when the limit resets
`;

const SETUP_GUIDE_TEMPLATE = `# Setup Guide

## Project: {{requirement}}

**Generated**: {{generatedAt}}

---

## Prerequisites

- Node.js 18.x or later
- pnpm 8.x or later
- PostgreSQL 14.x or later (or compatible database)
- Git

---

## Installation

### 1. Clone the Repository

\`\`\`bash
git clone <repository-url>
cd <project-directory>
\`\`\`

### 2. Install Dependencies

\`\`\`bash
pnpm install
\`\`\`

### 3. Configure Environment

Copy the environment template and fill in your values:

\`\`\`bash
cp .env.example .env
\`\`\`

Configure the following environment variables:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| \`DATABASE_URL\` | string | - | PostgreSQL connection string |
| \`API_PORT\` | number | 3000 | API server port |
| \`LOG_LEVEL\` | string | info | Logging level (debug, info, warn, error) |
| \`NODE_ENV\` | string | development | Runtime environment |

### 4. Database Setup

\`\`\`bash
pnpm db:migrate
pnpm db:seed
\`\`\`

### 5. Start Development Server

\`\`\`bash
pnpm dev
\`\`\`

The application will be available at \`http://localhost:3000\`.

---

## Configuration Reference

### Application Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3000 | HTTP server port |
| server.host | string | localhost | Server bind address |
| auth.jwtSecret | string | (required) | JWT signing secret |
| auth.jwtExpiry | string | 24h | JWT token expiry |
| db.poolSize | number | 10 | Database connection pool size |
| cache.ttl | number | 300 | Cache TTL in seconds |

---

## Verification

Run the test suite to verify your setup:

\`\`\`bash
pnpm test
\`\`\`

All tests should pass before proceeding with development.
`;

const TECHNICAL_REFERENCE_TEMPLATE = `# Technical Reference

## Project: {{requirement}}

**Generated**: {{generatedAt}}

---

## Architecture Overview

{{technicalDesign}}

---

## Module Descriptions

### Core Modules

The system is organized into the following modules, each with a single responsibility.

### Data Flow

Data flows through the system as follows:

1. Incoming requests are validated and authenticated at the API gateway layer.
2. Validated requests are routed to the appropriate service handler.
3. Service handlers process business logic and interact with data stores.
4. Responses are formatted and returned to the client.

---

## Database Schema

{{dbDesign}}

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Layered architecture | Separation of concerns, testability |
| RESTful API | Standardized, predictable interface |
| PostgreSQL | ACID compliance, mature ecosystem |

---

## Dependencies

### Runtime Dependencies

Dependencies are managed via pnpm and defined in \`package.json\`.

### Development Dependencies

| Tool | Purpose |
|------|---------|
| TypeScript | Type-safe JavaScript |
| Vitest | Unit and integration testing |
| ESLint | Code quality and style |
| Prettier | Code formatting |
`;

const OPERATIONS_GUIDE_TEMPLATE = `# Operations Guide

## Project: {{requirement}}

**Generated**: {{generatedAt}}

---

## Deployment

### Production Build

\`\`\`bash
pnpm build
\`\`\`

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Health check endpoints responsive
- [ ] Monitoring and logging configured
- [ ] Backup strategy in place

---

## Monitoring

### Health Checks

The application exposes the following health check endpoints:

| Endpoint | Description |
|----------|-------------|
| \`/health\` | Basic application health |
| \`/health/ready\` | Readiness probe (dependencies available) |
| \`/health/live\` | Liveness probe (application running) |

### Metrics

Key metrics to monitor:

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Request latency p99 | API response time | > 1000ms |
| Error rate | Percentage of 5xx responses | > 1% |
| Database connections | Active connections | > 80% of pool |
| Memory usage | RSS memory | > 80% of limit |

---

## Logging

Structured JSON logging is used. Log levels: debug, info, warn, error.

\`\`\`json
{
  "level": "info",
  "message": "Request completed",
  "requestId": "req_123",
  "method": "GET",
  "path": "/api/v1/resource",
  "statusCode": 200,
  "durationMs": 42
}
\`\`\`

---

## Backup and Recovery

### Database Backups

\`\`\`bash
# Create backup
pg_dump -h localhost -U user database > backup.sql

# Restore from backup
psql -h localhost -U user database < backup.sql
\`\`\`

### Backup Schedule

| Data | Frequency | Retention |
|------|-----------|-----------|
| Database | Daily | 30 days |
| Configuration files | On change | Git history |
| Logs | Continuous | 90 days |

---

## Maintenance

### Updating Dependencies

\`\`\`bash
pnpm update
pnpm audit
\`\`\`

### Running Migrations

\`\`\`bash
pnpm db:migrate
pnpm db:rollback
\`\`\`

### Troubleshooting

| Issue | Possible Cause | Resolution |
|-------|---------------|------------|
| Application won't start | Missing environment variables | Check .env file |
| Database connection failed | Database not running | Start database service |
| High memory usage | Memory leak | Restart service, investigate heap dump |
`;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "technical-documentation-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

function buildCombinedTemplate(): string {
  return [
    API_REFERENCE_TEMPLATE,
    "\n\n---\n\n",
    SETUP_GUIDE_TEMPLATE,
    "\n\n---\n\n",
    TECHNICAL_REFERENCE_TEMPLATE,
    "\n\n---\n\n",
    OPERATIONS_GUIDE_TEMPLATE,
  ].join("");
}

export async function runTechnicalDocumentationAgent(
  input: TechnicalDocumentationAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
    agentBackendConfig?: AgentBackendConfig | undefined;
  },
): Promise<TechnicalDocumentationAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? buildCombinedTemplate();

  if (options?.agentBackendConfig) {
    const agentPrompt = `You are a technical writer. Create comprehensive technical documentation for the following project.

Requirement: ${input.requirement}
Clarified Requirement: ${input.clarifiedRequirement}
Technical Design: ${input.technicalDesign}
API Design: ${input.apiDesign}
Database Design: ${input.dbDesign}
Task Breakdown: ${input.taskBreakdownMd}

Generate the following sections:
1. API Reference - endpoints, authentication, rate limiting
2. Setup Guide - prerequisites, installation, configuration
3. Technical Reference - architecture, modules, data flow
4. Operations Guide - deployment, monitoring, logging, backup`;

    const result = await runWithAgentBackend({
      config: options.agentBackendConfig,
      agentId: "TECHNICAL_DOCUMENTATION",
      agentName: "Technical Writer",
      systemPrompt:
        "You are a senior technical writer. Create comprehensive technical documentation including API references, setup guides, and operations manuals.",
      userPrompt: agentPrompt,
      context: { requirement: input.requirement },
      outputFormat: "markdown",
    });

    if (result?.content) {
      return parseTechnicalDocOutput(result.content, input.requirement);
    }
  }

  if (options?.aiTool) {
    const result = await runAgent({
      role: "TECHNICAL_DOCUMENTATION",
      promptTemplate: template,
      context: {
        rawRequirement: input.requirement,
        clarifiedRequirement: input.clarifiedRequirement,
        acceptanceCriteria: input.acceptanceCriteria,
        technicalDesign: input.technicalDesign,
        apiDesign: input.apiDesign,
        dbDesign: input.dbDesign,
        taskBreakdown: input.taskBreakdownMd,
        testMatrix: input.testMatrixMd,
        traceabilitySection: input.traceabilitySection ?? "",
        integrationPlanSection: input.integrationPlanSection ?? "",
        releasePlanSection: input.releasePlanSection ?? "",
      },
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parseTechnicalDocOutput(result.output, input.requirement);
    }
  }

  const context = {
    requirement: input.requirement,
    generatedAt: new Date().toISOString(),
    apiDesign: input.apiDesign || "No API design available.",
    technicalDesign: input.technicalDesign || "No technical design available.",
    dbDesign: input.dbDesign || "No database design available.",
  };

  return {
    apiReference: renderPrompt(API_REFERENCE_TEMPLATE, context),
    setupGuide: renderPrompt(SETUP_GUIDE_TEMPLATE, context),
    technicalReference: renderPrompt(TECHNICAL_REFERENCE_TEMPLATE, context),
    operationsGuide: renderPrompt(OPERATIONS_GUIDE_TEMPLATE, context),
  };
}
