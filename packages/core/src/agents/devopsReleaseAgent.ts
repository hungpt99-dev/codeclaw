import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAgent, renderPrompt } from "@aiteam/adapters";
import type { AiCliTool } from "@aiteam/adapters";
import { parseDevopsReleaseOutput } from "./parsers/devopsReleaseOutputParser.js";

export interface DevopsReleaseAgentInput {
  requirement: string;
  clarifiedRequirement: string;
  technicalDesign: string;
  apiDesign: string;
  taskBreakdownMd: string;
}

export interface DevopsReleaseAgentOutput {
  releasePlan: string;
  changelog: string;
}

const RELEASE_PLAN_TEMPLATE = `# Release Plan

## Release Overview for: {{requirement}}

### Version Strategy
- **Proposed Version**: 1.0.0 (SemVer)
- **Version Scheme**: \`MAJOR.MINOR.PATCH\`
- **Current Release Type**: Minor (new feature, backward compatible)

### Release Phases
| Phase | Activities | Estimated Duration | Owner |
|-------|-----------|-------------------|-------|
| Development | Feature implementation, unit tests | As per task breakdown | Development Team |
| Code Review | Peer review, static analysis | 2-3 days | Senior Developers |
| Staging Deployment | Deploy to staging, integration tests | 1 day | DevOps |
| QA Testing | Regression, E2E, performance tests | 2-3 days | QA Team |
| UAT | User acceptance testing with stakeholders | 2-3 days | Product Owner |
| Production Deployment | Deploy to production, smoke tests | 1 day | DevOps |
| Post-Release Monitoring | Monitor metrics, error rates, logs | 3 days | SRE Team |

### Deployment Considerations
- **Deployment Window**: Off-peak hours (e.g., Sunday 02:00-06:00)
- **Deployment Strategy**: Blue-green deployment
- **Rolling Update**: 20% increment, 2-min health check between batches
- **Feature Flags**: New features should be behind feature flags
- **Database Migrations**: Run migrations before app deployment
- **Cache Warming**: Pre-warm cache after deployment
- **DNS Propagation**: Allow 5 minutes for DNS changes

### Rollback Plan
| Step | Action | Estimated Time |
|------|--------|----------------|
| 1 | Detect critical error via monitoring alerts | Immediate |
| 2 | Trigger rollback via CI/CD pipeline | 1 min |
| 3 | Revert to previous stable version | 3 min |
| 4 | Run smoke tests on rolled-back version | 5 min |
| 5 | Notify stakeholders of rollback | 1 min |

**Rollback Triggers:**
- Error rate increases by > 5% above baseline
- P95 latency increases by > 500ms
- Any 500 error rate > 0.1%
- Database migration failure

### Environment Configuration
| Environment | URL | Variables Required | Access |
|-------------|-----|-------------------|--------|
| Development | http://localhost:3000 | Dev API keys | Local |
| Staging | https://staging.example.com | Staging API keys | VPN |
| Production | https://example.com | Production API keys | VPN + 2FA |

### Monitoring & Observability
- **Logs**: Centralized logging (e.g., ELK Stack)
- **Metrics**: Application metrics (e.g., Prometheus)
- **Traces**: Distributed tracing (e.g., OpenTelemetry)
- **Alerts**: Threshold-based alerts in PagerDuty
- **Dashboards**: Grafana dashboards for key metrics

### Testing Requirements for Release
- All unit tests must pass
- Integration tests for new endpoints: 100% coverage
- E2E tests for critical paths: all passing
- Performance tests: no regression in P95 latency
- Security scan: no critical or high vulnerabilities
`;

const CHANGELOG_TEMPLATE = `# Changelog

## [Unreleased]

### Added
- Feature implementation for: {{requirement}}

### Changed
- N/A (initial implementation)

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

---

## [1.0.0] - YYYY-MM-DD

### Added
- Initial release of the feature described in: {{requirement}}

### Known Issues
- None at this time
`;

const FALLBACK_TEMPLATES = `${RELEASE_PLAN_TEMPLATE}\n\n${CHANGELOG_TEMPLATE}`;

async function loadTemplate(templateDir: string | undefined): Promise<string | null> {
  if (!templateDir) return null;
  try {
    return await readFile(join(templateDir, "devops-release-agent.md"), "utf-8");
  } catch {
    return null;
  }
}

function buildDesignContext(input: DevopsReleaseAgentInput): string {
  const parts: string[] = [];
  if (input.technicalDesign) {
    parts.push("## Technical Design Context\n" + input.technicalDesign);
  }
  if (input.apiDesign) {
    parts.push("## API Design Context\n" + input.apiDesign);
  }
  if (input.taskBreakdownMd) {
    parts.push("## Task Breakdown Context\n" + input.taskBreakdownMd);
  }
  return parts.length > 0 ? parts.join("\n\n") : "";
}

export async function runDevopsReleaseAgent(
  input: DevopsReleaseAgentInput,
  options?: {
    templateDir?: string | undefined;
    aiTool?: { tool: AiCliTool; command: string; timeoutSeconds: number } | undefined;
  },
): Promise<DevopsReleaseAgentOutput> {
  const template = (await loadTemplate(options?.templateDir)) ?? FALLBACK_TEMPLATES;

  const designContext = buildDesignContext(input);

  if (options?.aiTool) {
    const context = {
      requirement: input.requirement,
      clarifiedRequirement: input.clarifiedRequirement,
    };

    const result = await runAgent({
      role: "DEVOPS_RELEASE",
      promptTemplate: designContext ? `${template}\n\n${designContext}` : template,
      context,
      aiToolConfig: options.aiTool,
    });

    if (result.success && result.usedAi) {
      return parseDevopsReleaseOutput(result.output, input.requirement);
    }
  }

  const context = { requirement: input.requirement };

  return {
    releasePlan: renderPrompt(RELEASE_PLAN_TEMPLATE, context),
    changelog: renderPrompt(CHANGELOG_TEMPLATE, context),
  };
}
