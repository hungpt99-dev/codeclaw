# Step 21: Repository Context Analyzer

## Mandatory Documentation Context Rule

This `opencode run` is a fresh session.

Do not rely on memory from previous OpenCode runs.

Before writing or modifying code, read the required project documentation once for this session.

After you have read the docs once in this same session, you do not need to read them again unless:

- you modify documentation files,
- you discover documentation changed,
- you are unsure about the architecture,
- you are about to make a decision that may conflict with the docs.

If this is a separate `opencode run`, a retry run, or a fix attempt, read the docs again because it is a new session.

## Docs to Read Once Per Session

Read these docs if they exist:

- README.md
- docs/DOCS_INDEX.md
- docs/AI_AGENT_RULES.md
- docs/ARCHITECTURE.md
- docs/DEVELOPMENT.md
- docs/CODE_QUALITY.md
- docs/CONTRIBUTING.md
- docs/SECURITY.md

Step-specific docs:

- docs/TECHNICAL_DESIGN.md
- docs/WORKFLOW_DESIGN.md
- docs/PRD.md
- docs/CLI_COMMAND_SPEC.md

Also inspect the current repository structure:

- package.json
- pnpm-workspace.yaml
- tsconfig.base.json
- apps/
- packages/
- templates/
- .automation/opencode-roadmap/

If PDF versions exist under docs/, treat them as exported/reference documents.
Prefer Markdown files as source of truth when available.
Do not read PDF files directly if equivalent Markdown files already exist.

## Session Docs Checklist

At the beginning of this session, create an internal checklist:

- [ ] Docs loaded
- [ ] Repo structure inspected
- [ ] Step objective understood
- [ ] Files to modify identified

After docs are loaded once, mark `Docs loaded` as done in your own working notes.
Do not create a physical file for this checklist unless needed.
This checklist is for the current OpenCode session only.

## Pre-Code Summary

Before coding, summarize:

1. Docs read in this session
2. Existing architecture
3. Current step objective
4. Existing files relevant to this step
5. Files you plan to modify

Only then implement the step.

## Common Implementation Rules

- Implement only this step.
- Read required docs once at the start of this OpenCode session.
- Do not rely on memory from previous OpenCode runs.
- Do not reread the same docs repeatedly within the same session unless docs changed or you are unsure.
- Inspect current repo structure before changing files.
- Do not implement future roadmap steps.
- Do not add cloud backend.
- Do not add login.
- Do not add billing.
- Do not add desktop app.
- Do not make Jira, Slack, or GitHub required.
- Jira, Slack, and GitHub must remain optional advanced integrations.
- The app must work without Jira, Slack, or GitHub config.
- Do not bypass quality checks.
- Do not weaken scripts just to pass checks.
- Do not remove tests just to make checks pass.
- Keep changes minimal and focused.
- Prefer updating existing files over creating duplicates.
- At the end, summarize docs read, changed files, and commands run.

---

Implement Step 21: Repository Context Analyzer.

## Background

The docs define a Repository Analyzer that detects project type, language, framework, build tool, test framework, source/test folders, and existing patterns (Technical §19, Workflow §7.4).

Currently agents generate designs without any project context. A Spring Boot project and a React project get the same generic output. The PRD explicitly identifies Java/Spring Boot as the initial niche (§8), but no detection or template exists.

This step builds a deterministic (non-AI) repository analyzer that detects project characteristics and passes them to agents as context. This makes output stack-specific and immediately more useful.

## Tasks

### 1. Add repository analysis types

In `packages/shared/src/types/domain.ts`:

```typescript
export type ProjectType = "java-spring-boot" | "node-nestjs" | "react-vite" | "node-express" | "generic";

export interface RepositoryAnalysis {
  projectType: ProjectType | null;
  language: string | null;
  framework: string | null;
  buildTool: string | null;
  testFramework: string | null;
  migrationTool: string | null;
  sourceDirs: string[];
  testDirs: string[];
  configFiles: string[];
  detectedPatterns: string[];
  packageManager: string | null;
  nodeVersion: string | null;
  javaVersion: string | null;
}
```

### 2. Create repository analyzer

Create `packages/core/src/repoAnalyzer/repoAnalyzer.ts`:

```typescript
export async function analyzeRepository(projectRoot: string): Promise<RepositoryAnalysis>
```

Detection logic:

**Java/Spring Boot detection:**
- Look for `pom.xml` → Maven, `build.gradle` → Gradle
- Check for Spring Boot in dependencies
- Detect `src/main/java`, `src/test/java`
- Detect JUnit/Mockito/TestNG
- Detect Flyway/Liquibase
- Detect Java version from `java -version` or `pom.xml`
- Detect common patterns: controller-service-repository, dto-based-api, etc.

**Node.js/NestJS detection:**
- Look for `package.json`
- Detect NestJS from `nest-cli.json` or `@nestjs/core` dependency
- Detect npm/pnpm/yarn from lockfile
- Detect `src/`, `test/` directories
- Detect Jest/Vitest/Mocha
- Detect Prisma/TypeORM

**React/Vite detection:**
- Look for `vite.config.ts`, `package.json`
- Detect React, Tailwind, Next.js
- Detect test framework (Vitest, Jest, Playwright)

**Generic detection:**
- Look for common config files
- Detect language from file extensions
- Detect `.gitignore`, `README.md`, `Dockerfile`

### 3. Create detection modules

Create separate detection files for each stack:

- `packages/core/src/repoAnalyzer/detectors/javaDetector.ts`
- `packages/core/src/repoAnalyzer/detectors/nodeDetector.ts`
- `packages/core/src/repoAnalyzer/detectors/reactDetector.ts`
- `packages/core/src/repoAnalyzer/detectors/genericDetector.ts`

Each detector exports a function:
```typescript
export async function detectJavaSpringBoot(root: string): Promise<Partial<RepositoryAnalysis> | null>
```

### 4. Export from core

Update `packages/core/src/index.ts`:
```typescript
export { analyzeRepository } from "./repoAnalyzer/repoAnalyzer.js";
export type { RepositoryAnalysis } from "@codeclaw/shared";
```

### 5. Add repository analysis to agent context

Update agent input types to optionally accept repository analysis:

```typescript
export interface ArchitectAgentInput {
  requirement: string;
  clarifiedRequirement: string;
  repositoryAnalysis?: RepositoryAnalysis; // NEW
}
```

### 6. Update architect agent to use repo analysis

Update `packages/core/src/agents/architectAgent.ts`:

- If repository analysis is available, include project type, framework, source structure in the design
- If LLM is enabled, pass repository context in the prompt
- If deterministic, adjust template to reference project type:

```markdown
## Project Context
- Type: {{projectType}}
- Language: {{language}}
- Framework: {{framework}}
- Source: {{sourceDirs}}
- Test: {{testDirs}}
```

### 7. Update workflow to run repo analysis

Update `packages/core/src/workflows/docsOnlyWorkflow.ts`:

- Before running Architect agent, call `analyzeRepository`
- Pass result to Architect agent
- Save analysis artifact to `design/repository-analysis.md`

Update `packages/core/src/workflows/assistedWorkflow.ts`:
- Same analysis step

### 8. Add repository analysis artifact

Update `packages/core/src/artifacts/artifactWriter.ts`:
- Already has `designDir`, analysis file can be written there

### 9. Add codeclaw analyze CLI command

Create `apps/cli/src/commands/analyze.ts`:

```bash
codeclaw analyze
codeclaw analyze --run <runId>
```

Options:
- `--run <runId>` — Save analysis to existing run's design dir
- `--json` — Output JSON
- `--include <glob>` — Include file pattern
- `--exclude <glob>` — Exclude file pattern

Register in CLI entry point.

### 10. Show repository analysis in web UI

Update `apps/local-web/src/pages/RunDetail.tsx`:

Add repository analysis section to the "Design" tab showing:
- Project Type
- Language, Framework, Build Tool
- Source directories
- Test directories
- Detected patterns

### 11. Add analyze API route

Update `packages/server/src/routes/runs.routes.ts`:

```typescript
// POST /api/runs/:id/analyze — Trigger repository analysis for a run
```

### 12. Update codeclaw init to detect project type

Update `apps/cli/src/commands/init.ts`:

After creating `.codeclaw/`, run `analyzeRepository` and print detected project type:

```
Detected: Java / Spring Boot
Build tool: Maven
Test command: mvn test
```

### 13. Update doctor command

Update `apps/cli/src/commands/doctor.ts`:
- Add Maven/Gradle/npm detection based on project type
- Add test framework detection

### 14. Add tests

- Test Java/Spring Boot detection with mock files
- Test Node/NestJS detection
- Test React/Vite detection
- Test generic fallback
- Test empty directory handling
- Test analysis artifact creation

## Acceptance Criteria

- `analyzeRepository()` correctly detects project type in test projects
- Java/Spring Boot detection works (pom.xml, src/main/java, etc.)
- Node/NestJS detection works (package.json, nest-cli.json, etc.)
- React/Vite detection works (vite.config.ts, etc.)
- Architect agent output references detected project type
- `codeclaw analyze` CLI command works
- Analysis saved as artifact in run
- Web UI shows analysis in Design tab
- `codeclaw init` prints detected project type
- All existing tests pass

## Files to Create

- `packages/core/src/repoAnalyzer/repoAnalyzer.ts`
- `packages/core/src/repoAnalyzer/detectors/javaDetector.ts`
- `packages/core/src/repoAnalyzer/detectors/nodeDetector.ts`
- `packages/core/src/repoAnalyzer/detectors/reactDetector.ts`
- `packages/core/src/repoAnalyzer/detectors/genericDetector.ts`
- `apps/cli/src/commands/analyze.ts`

## Files to Modify

- `packages/shared/src/types/domain.ts`
- `packages/shared/src/index.ts`
- `packages/core/src/index.ts`
- `packages/core/src/agents/architectAgent.ts`
- `packages/core/src/agents/types.ts` (if exists) or agent input interfaces
- `packages/core/src/workflows/docsOnlyWorkflow.ts`
- `packages/core/src/workflows/assistedWorkflow.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/commands/init.ts`
- `apps/cli/src/commands/doctor.ts`
- `apps/local-web/src/pages/RunDetail.tsx`
- `packages/server/src/routes/runs.routes.ts`

## Rules

Implement only this step.
Do not implement future roadmap steps.
Use deterministic file-based detection only. No AI for repository analysis.
Do not add cloud backend.
Do not add login.
Do not add billing.
Do not add desktop app.
Do not add Jira/Slack/GitHub integration.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
