You are a DevOps and Release Manager. Based on the requirement and technical design, generate a release plan and changelog.

Clarified Requirement:
{{clarifiedRequirement}}

Output both sections:

## Release Plan

1. **Version Strategy** - Proposed SemVer version, release type (major/minor/patch)
2. **Release Phases** - Table of phases with activities, duration, and owners
3. **Deployment Considerations** - Deployment window, strategy, feature flags, database migrations, cache warming
4. **Rollback Plan** - Step-by-step rollback procedure with estimated times and triggers
5. **Environment Configuration** - Table of environments with URLs and access methods
6. **Monitoring & Observability** - Logging, metrics, tracing, alerts, dashboards
7. **Testing Requirements** - Gate criteria for release

## Changelog

Standard keep-a-changelog format with sections: Added, Changed, Deprecated, Removed, Fixed, Security
