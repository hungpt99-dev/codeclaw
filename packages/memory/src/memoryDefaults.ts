import type { MemoryScope, MemoryFormat } from "@aiteam/shared";

export const DEFAULT_MEMORY_FILES: Record<
  string,
  { scope: MemoryScope; title: string; format: MemoryFormat; tags: string[]; content: string }
> = {
  "README.md": {
    scope: "project",
    title: "Runtime Memory Overview",
    format: "markdown",
    tags: ["memory", "overview"],
    content: `# Runtime Memory

This directory contains runtime memory for the Local AI Software Team.

## Structure

- **project/** — Project-specific memory (summary, architecture, tech stack, conventions)
- **decisions/** — Architectural and technical decisions
- **agents/** — Per-agent memory files
- **indexes/** — Memory and repository indexes

## Usage

Runtime memory is loaded by the MemoryManager when workflows run.
Agents receive scoped context built from these memory files.

## Important

- This is runtime product memory, not build-time documentation.
- Build-time docs live in \`docs/\` at the project root.
- Do not edit these files manually unless you understand the impact.
`,
  },

  "project/project-summary.md": {
    scope: "project",
    title: "Project Summary",
    format: "markdown",
    tags: ["project", "summary"],
    content: `# Project Summary

Status: Not analyzed yet.

This file is runtime memory for the local project.
It can be updated by future workflow steps.
`,
  },

  "project/architecture-summary.md": {
    scope: "project",
    title: "Architecture Summary",
    format: "markdown",
    tags: ["project", "architecture"],
    content: `# Architecture Summary

Status: Not analyzed yet.

This file describes the project architecture.
It can be updated by future workflow steps.
`,
  },

  "project/tech-stack.md": {
    scope: "project",
    title: "Tech Stack",
    format: "markdown",
    tags: ["project", "tech-stack"],
    content: `# Tech Stack

Status: Not analyzed yet.

This file describes the technology stack used by the project.
It can be updated by future workflow steps.
`,
  },

  "project/repo-structure.md": {
    scope: "project",
    title: "Repository Structure",
    format: "markdown",
    tags: ["project", "repo"],
    content: `# Repository Structure

Status: Not analyzed yet.

This file describes the repository structure.
It can be updated by future workflow steps.
`,
  },

  "project/coding-conventions.md": {
    scope: "project",
    title: "Coding Conventions",
    format: "markdown",
    tags: ["project", "conventions"],
    content: `# Coding Conventions

Status: Not analyzed yet.

This file describes coding conventions used by the project.
It can be updated by future workflow steps.
`,
  },

  "decisions/README.md": {
    scope: "decision",
    title: "Architectural Decisions",
    format: "markdown",
    tags: ["decisions", "overview"],
    content: `# Architectural Decisions

This directory contains records of architectural and technical decisions.

Each decision should be documented in its own file with:
- Date
- Context
- Decision
- Rationale
- Consequences

No decisions have been recorded yet.
`,
  },

  "agents/ba-memory.md": {
    scope: "agent",
    title: "BA Agent Memory",
    format: "markdown",
    tags: ["agent", "ba"],
    content: `# BA Agent Memory

## Role
Business Analyst — clarifies requirements, extracts business rules, defines acceptance criteria.

## Recent Context
No previous runs recorded.

## Preferences
- Default output language: bilingual (English/Vietnamese)
- Default format: markdown
`,
  },

  "agents/architect-memory.md": {
    scope: "agent",
    title: "Architect Agent Memory",
    format: "markdown",
    tags: ["agent", "architect"],
    content: `# Architect Agent Memory

## Role
Architect — designs technical solutions, APIs, database schemas, and service flows.

## Recent Context
No previous runs recorded.

## Preferences
- Default output language: bilingual (English/Vietnamese)
- Default format: markdown
`,
  },

  "agents/pm-memory.md": {
    scope: "agent",
    title: "PM Agent Memory",
    format: "markdown",
    tags: ["agent", "pm"],
    content: `# PM Agent Memory

## Role
Project Manager — breaks work into tasks, defines dependencies, estimates complexity.

## Recent Context
No previous runs recorded.

## Preferences
- Default output language: bilingual (English/Vietnamese)
- Default format: markdown
`,
  },

  "agents/qa-memory.md": {
    scope: "agent",
    title: "QA Agent Memory",
    format: "markdown",
    tags: ["agent", "qa"],
    content: `# QA Agent Memory

## Role
QA — creates test matrices, maps test cases to acceptance criteria, analyzes test failures.

## Recent Context
No previous runs recorded.

## Preferences
- Default output language: bilingual (English/Vietnamese)
- Default format: markdown
`,
  },

  "agents/reporter-memory.md": {
    scope: "agent",
    title: "Reporter Agent Memory",
    format: "markdown",
    tags: ["agent", "reporter"],
    content: `# Reporter Agent Memory

## Role
Reporter — summarizes final delivery, generates traceability matrix, identifies next steps.

## Recent Context
No previous runs recorded.

## Preferences
- Default output language: bilingual (English/Vietnamese)
- Default format: markdown
`,
  },

  "indexes/memory-index.json": {
    scope: "project",
    title: "Memory Index",
    format: "json",
    tags: ["index", "memory"],
    content: JSON.stringify(
      {
        description: "Index of all runtime memory files",
        lastIndexed: null,
        files: [],
      },
      null,
      2,
    ),
  },

  "indexes/repo-index.json": {
    scope: "repo",
    title: "Repository Index",
    format: "json",
    tags: ["index", "repo"],
    content: JSON.stringify(
      {
        description: "Index of repository structure and key files",
        lastIndexed: null,
        files: [],
      },
      null,
      2,
    ),
  },
};
