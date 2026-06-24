import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@aiteam/adapters";
import type { AiCliTool } from "@aiteam/adapters";
import type { RepositoryAnalysis } from "@aiteam/shared";
import { parseFrontendPlannerOutput } from "./parsers/frontendPlannerOutputParser.js";

export interface FrontendPlannerAgentInput {
  requirement: string;
  clarifiedRequirement: string;
  scopeDefinition?: string;
  mvpScope?: string;
  successCriteria?: string;
  repositoryAnalysis?: RepositoryAnalysis;
  userPersonas?: string;
  userFlows?: string;
  screenDescriptions?: string;
  componentBreakdown?: string;
}

export interface FrontendPlannerAgentOutput {
  componentTree: string;
  stateManagement: string;
  routingDesign: string;
  dataFetchingStrategy: string;
}

const COMPONENT_TREE_TEMPLATE = `# Component Tree

## Component Hierarchy for: {{requirement}}

### App Shell
| Component | Responsibility |
|-----------|---------------|
| App | Root component, global providers |
| Layout | Page layout with header, sidebar, main |
| Header | Navigation, user menu, search |
| Sidebar | Secondary navigation, filters |

### Feature Components
| Component | Responsibility | Parent |
|-----------|---------------|--------|
| FeatureContainer | Orchestrates feature | Layout > Main |
| DataList | Renders list of items | FeatureContainer |
| DataCard | Individual item display | DataList |
| DetailPanel | Shows item details | FeatureContainer |
| FormDialog | Data entry form | FeatureContainer |

### Shared Components
| Component | Responsibility |
|-----------|---------------|
| Button | Reusable button with variants |
| Input | Form input with validation |
| Modal | Overlay dialog container |
| Toast | Notification display |
| Spinner | Loading indicator |
| ErrorBoundary | Error state catch and display |

### Empty & Error States
- **Loading**: Skeleton screens for lists, spinners for actions
- **Empty**: Illustrated empty state with call-to-action
- **Error**: Inline error messages, error boundary fallback
- **Offline**: Banner notification for connectivity loss
`;

const STATE_MANAGEMENT_TEMPLATE = `# State Management

## State Architecture for: {{requirement}}

### Global State (Server / Auth / Theme)
- **State Type**: Context + Reducer or Zustand store
- **Scope**: Application-wide data (user, settings, notifications)
- **Actions**: Login, logout, update preferences, dismiss notification

### Server State (Data fetching)
- **Approach**: React Query / SWR / RTK Query
- **Caching**: Stale-while-revalidate, cache invalidation on mutation
- **Loading**: Suspense boundaries or loading states per query
- **Error**: Retry logic with exponential backoff

### Local State (UI / Form)
- **Approach**: useState / useReducer
- **Scope**: Component-specific UI state (open/close dialogs, form input values)
- **Form State**: Library like React Hook Form with validation

### State Shape
\`\`\`typescript
interface AppState {
  auth: { user: User | null; isLoading: boolean };
  feature: { items: Item[]; selectedId: string | null };
  ui: { sidebarOpen: boolean; activeModal: string | null };
}
\`\`\`

### State Flow Diagram
1. User action → Component dispatches event
2. Event handler calls service/API
3. Response updates global store or local state
4. React re-renders affected components
`;

const ROUTING_DESIGN_TEMPLATE = `# Routing Design

## Routes for: {{requirement}}

### Route Structure
| Path | Component | Layout | Auth Required |
|------|-----------|--------|---------------|
| / | HomePage | PublicLayout | No |
| /login | LoginPage | AuthLayout | No |
| /dashboard | DashboardPage | AppLayout | Yes |
| /feature | FeatureListPage | AppLayout | Yes |
| /feature/:id | FeatureDetailPage | AppLayout | Yes |
| /feature/new | FeatureCreatePage | AppLayout | Yes |
| /feature/:id/edit | FeatureEditPage | AppLayout | Yes |
| /settings | SettingsPage | AppLayout | Yes |
| * | NotFoundPage | PublicLayout | No |

### Navigation Flow
- **Public routes**: / → /login → redirect to /dashboard after auth
- **Authenticated routes**: /dashboard as default, feature CRUD flow
- **Guards**: AuthGuard wrapper checks token, redirects to /login if missing
- **Nested layouts**: PublicLayout vs AppLayout with different chrome

### Route Conventions
- All routes under /api prefix for API routes (Next.js App Router)
- Dynamic segments use [param] convention
- Parallel routes for complex layouts where needed
`;

const DATA_FETCHING_TEMPLATE = `# Data Fetching Strategy

## Data Fetching for: {{requirement}}

### API Layer
- **Client**: fetch / axios / graphql-request
- **Base Configuration**: Base URL, default headers, interceptors for auth token
- **Auth Token**: Attached via interceptor, refresh on 401

### Data Fetching Patterns
| Pattern | When to Use |
|---------|-------------|
| Server-side fetch | Initial page load, SEO-critical data |
| Client-side fetch | User-triggered actions, real-time updates |
| Infinite scroll | Paginated lists with user-driven loading |
| Optimistic update | Actions where success is predictable |

### Query Strategy
- **Stale time**: Short (30s) for frequently updated data, long (5min) for static
- **Retry**: 3 retries with exponential backoff
- **Prefetching**: Preload data on hover or route change intent
- **Pagination**: Cursor-based for large datasets, offset-based for simple lists

### Error & Loading States
- **Loading**: Skeleton or spinner per query
- **Empty**: Dedicated empty state component
- **Error**: Inline toast or banner, retry button
- **Offline**: Detection via navigator.onLine, queue pending mutations
`;

const FALLBACK_TEMPLATES = `${COMPONENT_TREE_TEMPLATE}\n\n${STATE_MANAGEMENT_TEMPLATE}\n\n${ROUTING_DESIGN_TEMPLATE}\n\n${DATA_FETCHING_TEMPLATE}`;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "frontend-planner-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

function buildProjectContext(input: FrontendPlannerAgentInput): string {
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

function buildUxContext(input: FrontendPlannerAgentInput): string {
  const sections: string[] = [];
  if (input.userPersonas) sections.push(`## User Personas\n${input.userPersonas}`);
  if (input.userFlows) sections.push(`## User Flows\n${input.userFlows}`);
  if (input.screenDescriptions)
    sections.push(`## Screen Descriptions\n${input.screenDescriptions}`);
  if (input.componentBreakdown)
    sections.push(`## Component Breakdown\n${input.componentBreakdown}`);
  return sections.length > 0 ? `\n\n## UX Context\n${sections.join("\n\n")}` : "";
}

function buildDesignWithContext(
  template: string,
  context: Record<string, string>,
  extraContext: string,
): string {
  if (!extraContext) return renderPrompt(template, context);
  return `${renderPrompt(template, context)}\n\n${extraContext}`;
}

export async function runFrontendPlannerAgent(
  input: FrontendPlannerAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<FrontendPlannerAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATES;

  const projectContext = buildProjectContext(input);
  const uxContext = buildUxContext(input);
  const extraContext = [projectContext, uxContext].filter(Boolean).join("\n");

  if (options?.aiTool) {
    const context = {
      requirement: input.requirement,
      clarifiedRequirement: input.clarifiedRequirement,
    };

    const result = await runAgent({
      role: "FRONTEND_PLANNER",
      promptTemplate: extraContext ? `${template}\n\n${extraContext}` : template,
      context,
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parseFrontendPlannerOutput(result.output, input.requirement);
    }
  }

  const context = { requirement: input.requirement };

  return {
    componentTree: buildDesignWithContext(COMPONENT_TREE_TEMPLATE, context, extraContext),
    stateManagement: buildDesignWithContext(STATE_MANAGEMENT_TEMPLATE, context, extraContext),
    routingDesign: buildDesignWithContext(ROUTING_DESIGN_TEMPLATE, context, extraContext),
    dataFetchingStrategy: buildDesignWithContext(DATA_FETCHING_TEMPLATE, context, extraContext),
  };
}
