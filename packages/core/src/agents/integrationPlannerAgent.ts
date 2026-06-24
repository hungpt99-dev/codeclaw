import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@aiteam/adapters";
import type { AiCliTool } from "@aiteam/adapters";
import { parseIntegrationPlannerOutput } from "./parsers/integrationPlannerOutputParser.js";

export interface IntegrationPlannerAgentInput {
  requirement: string;
  clarifiedRequirement: string;
  apiDesign: string;
  technicalDesign: string;
}

export interface IntegrationPlannerAgentOutput {
  integrationPlan: string;
}

const INTEGRATION_PLAN_TEMPLATE = `# Integration Plan

## Integration Overview for: {{requirement}}

### External System Touchpoints
| System | Integration Type | Data Flow Direction | Protocol |
|--------|-----------------|---------------------|----------|
| Payment Gateway | REST API | Outbound | HTTPS/REST |
| Email Service | SMTP/API | Outbound | SMTP/HTTPS |
| SSO Provider | OAuth 2.0 / OIDC | Inbound | HTTPS |

### Integration Contracts

#### 1. Payment Gateway Integration
- **System**: Payment Gateway
- **Endpoint**: POST /api/v1/charges
- **Authentication**: API Key (via \`PAYMENT_GATEWAY_API_KEY\` env var)
- **Timeout**: 30s
- **Idempotency**: Supported via idempotency key header

**Request Schema:**
\`\`\`json
{
  "amount": "number",
  "currency": "string (ISO 4217)",
  "source": "string (token)",
  "idempotency_key": "string (UUID)"
}
\`\`\`

**Response Schema:**
\`\`\`json
{
  "id": "string",
  "status": "succeeded | pending | failed",
  "amount": "number",
  "currency": "string"
}
\`\`\`

#### 2. Email Service Integration
- **System**: Email Service
- **Endpoint**: POST /api/v1/send
- **Authentication**: Bearer Token (via \`EMAIL_SERVICE_TOKEN\` env var)
- **Timeout**: 15s

**Request Schema:**
\`\`\`json
{
  "to": ["string (email)"],
  "subject": "string",
  "body": "string (HTML)",
  "template_id": "string (optional)"
}
\`\`\`

#### 3. SSO Provider Integration
- **System**: SSO Provider
- **Protocol**: OAuth 2.0 + OpenID Connect
- **Redirect URI**: \`https://app.example.com/auth/callback\`
- **Scopes**: openid, profile, email

### Error Handling
| System | Error Scenario | Handling Strategy | Fallback Behavior |
|--------|---------------|-------------------|-------------------|
| Payment Gateway | Timeout (30s) | Retry up to 3 times with exponential backoff | Queue for manual processing |
| Payment Gateway | 500 Internal Error | Retry with backoff (1s, 2s, 4s) | Log and alert operations team |
| Payment Gateway | 402 Payment Required | No retry | Notify user of payment failure |
| Email Service | Timeout (15s) | Retry up to 2 times | Store in failed email queue |
| Email Service | 429 Rate Limited | Backoff with Retry-After header | Queue for delayed delivery |
| SSO Provider | Token Expired | Refresh token flow | Re-authenticate user |
| SSO Provider | Invalid Token | Clear session, redirect to login | Log security event |

### Retry Strategy
| System | Max Retries | Backoff Type | Initial Delay | Max Delay |
|--------|-------------|--------------|---------------|-----------|
| Payment Gateway | 3 | Exponential | 1s | 10s |
| Email Service | 2 | Exponential | 500ms | 5s |
| SSO Provider | 1 | Immediate | 0s | 0s |

### Circuit Breaker Configuration
| System | Failure Threshold | Reset Timeout | Half-Open Max Calls |
|--------|------------------|---------------|---------------------|
| Payment Gateway | 5 consecutive failures | 60s | 3 |
| Email Service | 3 consecutive failures | 30s | 2 |
| SSO Provider | 3 consecutive failures | 30s | 2 |

### Monitoring & Alerting
| System | Metric | Threshold | Alert Channel |
|--------|--------|-----------|---------------|
| Payment Gateway | Error Rate | > 1% in 5 min | PagerDuty |
| Email Service | Queue Depth | > 100 | Slack |
| SSO Provider | Login Failure Rate | > 5% | PagerDuty |

### Security Considerations
- All secrets must use environment variable references, never hardcoded
- API keys stored in \`.env\` file (excluded from version control)
- TLS 1.2+ required for all external communications
- Webhook signatures must be verified for incoming callbacks
- Rate limiting at application level (100 req/min per client)
`;

const FALLBACK_TEMPLATES = INTEGRATION_PLAN_TEMPLATE;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "integration-planner-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

function buildApiContext(input: IntegrationPlannerAgentInput): string {
  const parts: string[] = [];
  if (input.apiDesign) {
    parts.push("## API Design Context\n" + input.apiDesign);
  }
  if (input.technicalDesign) {
    parts.push("## Technical Design Context\n" + input.technicalDesign);
  }
  return parts.length > 0 ? parts.join("\n\n") : "";
}

export async function runIntegrationPlannerAgent(
  input: IntegrationPlannerAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<IntegrationPlannerAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATES;

  const apiContext = buildApiContext(input);

  if (options?.aiTool) {
    const context = {
      requirement: input.requirement,
      clarifiedRequirement: input.clarifiedRequirement,
      apiDesign: input.apiDesign,
    };

    const result = await runAgent({
      role: "INTEGRATION_PLANNER",
      promptTemplate: apiContext ? `${template}\n\n${apiContext}` : template,
      context,
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parseIntegrationPlannerOutput(result.output, input.requirement);
    }
  }

  const context = { requirement: input.requirement };

  return {
    integrationPlan: renderPrompt(INTEGRATION_PLAN_TEMPLATE, context),
  };
}
