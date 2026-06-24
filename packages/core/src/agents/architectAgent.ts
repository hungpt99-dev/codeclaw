import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@codeclaw/adapters";
import type { AiCliTool } from "@codeclaw/adapters";
import type { RepositoryAnalysis } from "@codeclaw/shared";
import { parseArchitectOutput } from "./parsers/architectOutputParser.js";

export interface ArchitectAgentInput {
  requirement: string;
  clarifiedRequirement: string;
  scopeDefinition?: string;
  mvpScope?: string;
  successCriteria?: string;
  repositoryAnalysis?: RepositoryAnalysis;
}

export interface ArchitectAgentOutput {
  technicalDesign: string;
  apiDesign: string;
  dbDesign: string;
}

const TECHNICAL_DESIGN_TEMPLATE = `# Technical Design

## Design for: {{requirement}}

### Architecture Overview
This document describes the technical architecture for implementing the requirement.

### Component Breakdown
| Component | Responsibility | Technology |
|-----------|---------------|------------|
| Input Layer | Receive and validate incoming data | Standard library / framework |
| Processing Layer | Core business logic execution | Domain services |
| Output Layer | Format and deliver results | Response formatters |
| Error Handler | Centralized error management | Error boundary / middleware |

### Data Flow
1. Input enters through the Input Layer.
2. Input is validated and transformed into domain objects.
3. Domain objects are passed to the Processing Layer.
4. Processing Layer executes business logic.
5. Results are formatted by the Output Layer.
6. Errors at any stage are caught by the Error Handler.

### Design Patterns
- **Separation of Concerns**: Each layer has a single responsibility.
- **Dependency Injection**: Dependencies are provided, not created internally.
- **Factory Pattern**: Complex object creation is delegated to factories.
- **Strategy Pattern**: Interchangeable algorithms where behavior varies.

### Technology Stack
- Runtime: Node.js (current LTS)
- Language: TypeScript
- Testing: Vitest
- Linting: ESLint + Prettier

### Cross-Cutting Concerns
- **Logging**: Structured logging at appropriate levels.
- **Error Handling**: Consistent error responses with trace IDs.
- **Validation**: Input validation at system boundaries.
- **Monitoring**: Key metrics for throughput, latency, and error rates.
`;

const API_DESIGN_TEMPLATE = `# API Design

## API for: {{requirement}}

### Endpoints

#### Primary Endpoint
- **Method**: POST
- **Path**: /api/v1/process
- **Description**: Main processing endpoint for the requirement.

**Request Body:**
\`\`\`json
{
  "input": "string",
  "options": {
    "mode": "default"
  }
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "id": "uuid",
  "status": "completed",
  "result": {},
  "timestamp": "ISO8601"
}
\`\`\`

**Response (400):**
\`\`\`json
{
  "error": "VALIDATION_ERROR",
  "message": "Description of the validation failure",
  "details": []
}
\`\`\`

**Response (500):**
\`\`\`json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "traceId": "uuid"
}
\`\`\`

### Status Endpoint
- **Method**: GET
- **Path**: /api/v1/status/:id
- **Description**: Check the status of a processing request.

**Response (200):**
\`\`\`json
{
  "id": "uuid",
  "status": "completed | processing | failed",
  "progress": 100,
  "result": {}
}
\`\`\`

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Input failed validation |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource state conflict |
| INTERNAL_ERROR | 500 | Unexpected server error |

### API Conventions
- All endpoints return JSON.
- Timestamps are in ISO 8601 format.
- IDs are UUID v4 strings.
- Pagination uses cursor-based approach where applicable.
`;

const DB_DESIGN_TEMPLATE = `# Database Design

## Schema for: {{requirement}}

### Entity-Relationship Overview

### Tables

#### main_entity
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| status | VARCHAR(50) | NOT NULL | Current processing status |
| input_data | TEXT | NOT NULL | Original input payload |
| result_data | TEXT | | Processing result |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | Last update timestamp |

#### processing_log
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| entity_id | UUID | FOREIGN KEY → main_entity(id) | Reference to main entity |
| event | VARCHAR(100) | NOT NULL | Event type |
| details | TEXT | | Event details |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | Event timestamp |

### Indexes
| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| main_entity | idx_status | status | Filter by status |
| main_entity | idx_created_at | created_at | Time-based queries |
| processing_log | idx_entity_id | entity_id | Join with main entity |

### Migrations
- All schema changes must be versioned and reversible.
- Use timestamped migration files.
- Test migrations against a copy of production data before applying.

### Data Retention
- Processing logs: retained for 90 days.
- Main entities: retained indefinitely unless archiving policy applies.
`;

const FALLBACK_TEMPLATES = `${TECHNICAL_DESIGN_TEMPLATE}\n\n${API_DESIGN_TEMPLATE}\n\n${DB_DESIGN_TEMPLATE}`;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "architect-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

function buildProjectContext(input: ArchitectAgentInput): string {
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

export async function runArchitectAgent(
  input: ArchitectAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<ArchitectAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATES;

  const projectContext = buildProjectContext(input);

  if (options?.aiTool) {
    const context = {
      requirement: input.requirement,
      clarifiedRequirement: input.clarifiedRequirement,
    };

    const result = await runAgent({
      role: "ARCHITECT",
      promptTemplate: projectContext ? `${template}\n\n${projectContext}` : template,
      context,
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parseArchitectOutput(result.output, input.requirement);
    }
  }

  const context = { requirement: input.requirement };

  return {
    technicalDesign: buildDesignWithContext(TECHNICAL_DESIGN_TEMPLATE, context, projectContext),
    apiDesign: buildDesignWithContext(API_DESIGN_TEMPLATE, context, projectContext),
    dbDesign: buildDesignWithContext(DB_DESIGN_TEMPLATE, context, projectContext),
  };
}
