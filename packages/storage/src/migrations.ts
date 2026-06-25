import type { DbConnection } from "./db.js";

const MIGRATIONS_TABLE = "schema_migrations";

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 2,
    name: "add_project_id_to_runs",
    sql: `
      ALTER TABLE runs ADD COLUMN project_id TEXT;
      ALTER TABLE runs ADD COLUMN workflow_template_id TEXT;
      ALTER TABLE runs ADD COLUMN workflow_mode TEXT;
      CREATE INDEX IF NOT EXISTS idx_runs_project_id ON runs(project_id);
    `,
  },
  {
    version: 3,
    name: "add_step_kind_to_step_executions",
    sql: `
      ALTER TABLE step_executions ADD COLUMN step_kind TEXT;
      ALTER TABLE step_executions ADD COLUMN step_order INTEGER;
    `,
  },
  {
    version: 4,
    name: "add_workflow_template_seed_state",
    sql: `
      CREATE TABLE IF NOT EXISTS schema_seeds (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        seed_name TEXT NOT NULL,
        seeded_at TEXT NOT NULL,
        UNIQUE(project_id, seed_name)
      );
    `,
  },
];

function ensureMigrationsTable(db: DbConnection): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

function getAppliedVersions(db: DbConnection): number[] {
  const rows = db.prepare(`SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version ASC`).all() as {
    version: number;
  }[];
  return rows.map((r) => r.version);
}

export function runMigrations(db: DbConnection): void {
  ensureMigrationsTable(db);
  const applied = getAppliedVersions(db);

  for (const migration of MIGRATIONS) {
    if (applied.includes(migration.version)) continue;

    try {
      db.exec(migration.sql);
      db.prepare(
        `INSERT INTO ${MIGRATIONS_TABLE} (version, name, applied_at) VALUES (?, ?, ?)`,
      ).run(migration.version, migration.name, new Date().toISOString());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // If column already exists (ALREADY_EXISTS), skip
      if (message.includes("duplicate column") || message.includes("already exists")) {
        db.prepare(
          `INSERT OR IGNORE INTO ${MIGRATIONS_TABLE} (version, name, applied_at) VALUES (?, ?, ?)`,
        ).run(migration.version, migration.name, new Date().toISOString());
      } else {
        throw err;
      }
    }
  }
}
