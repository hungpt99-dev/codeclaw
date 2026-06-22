# Step 04: Storage Package

Implement Step 04: Storage Package.

Work mainly in packages/storage.

Use better-sqlite3.

Create:

- packages/storage/src/db.ts
- packages/storage/src/schema.ts
- packages/storage/src/repositories/runRepository.ts
- packages/storage/src/repositories/artifactRepository.ts
- packages/storage/src/repositories/settingRepository.ts
- packages/storage/src/index.ts

SQLite schema:

```sql
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  raw_requirement TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  format TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Implement:

- openDatabase
- initializeSchema
- RunRepository.create
- RunRepository.findById
- RunRepository.findRecent
- RunRepository.updateStatus
- ArtifactRepository.create
- ArtifactRepository.findByRunId
- ArtifactRepository.findById
- SettingRepository.get
- SettingRepository.set

Add tests.

Acceptance criteria:
storage package builds.
tests pass.
schema can initialize multiple times safely.
repositories perform basic CRUD.

## Rules

Implement only this step.
Do not implement future roadmap steps.
Do not add real AI calls.
Do not add cloud backend.
Do not add login.
Do not add billing.
Do not add desktop app.
Do not add Jira/Slack/GitHub integration unless this step explicitly asks.
Do not bypass quality checks.
Keep changes minimal and focused.
At the end, summarize changed files and commands run.
