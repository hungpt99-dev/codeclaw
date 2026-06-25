import type { DbConnection } from "../db.js";

export interface WorkflowTemplateRecord {
  id: string;
  projectId: string | null;
  name: string;
  description: string | null;
  steps: string;
  isDefault: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowTemplateInput {
  id: string;
  projectId: string | undefined;
  name: string;
  description: string | undefined;
  steps: string;
  isDefault: boolean;
  createdAt: string | undefined;
  updatedAt: string | undefined;
}

export function createWorkflowTemplateRepository(db: DbConnection) {
  const findAll = (projectId?: string): WorkflowTemplateRecord[] => {
    if (projectId) {
      return db
        .prepare(
          "SELECT * FROM workflow_templates WHERE project_id = ? OR project_id IS NULL ORDER BY created_at DESC",
        )
        .all(projectId) as WorkflowTemplateRecord[];
    }
    return db
      .prepare("SELECT * FROM workflow_templates ORDER BY created_at DESC")
      .all() as WorkflowTemplateRecord[];
  };

  const findById = (id: string): WorkflowTemplateRecord | undefined => {
    return db.prepare("SELECT * FROM workflow_templates WHERE id = ?").get(id) as
      | WorkflowTemplateRecord
      | undefined;
  };

  const create = (input: CreateWorkflowTemplateInput): WorkflowTemplateRecord => {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO workflow_templates (id, project_id, name, description, steps, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.id,
      input.projectId ?? null,
      input.name,
      input.description ?? null,
      input.steps,
      input.isDefault ? 1 : 0,
      input.createdAt ?? now,
      input.updatedAt ?? now,
    );
    const created = findById(input.id);
    if (!created) {
      throw new Error("Failed to create workflow template");
    }
    return created;
  };

  const update = (
    id: string,
    data: {
      name: string | undefined;
      description: string | undefined;
      steps: string | undefined;
      isDefault: boolean | undefined;
    },
  ): WorkflowTemplateRecord | undefined => {
    const existing = findById(id);
    if (!existing) return undefined;
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE workflow_templates SET name = ?, description = ?, steps = ?, is_default = ?, updated_at = ? WHERE id = ?`,
    ).run(
      data.name ?? existing.name,
      data.description ?? existing.description,
      data.steps ?? existing.steps,
      data.isDefault ? 1 : existing.isDefault,
      now,
      id,
    );
    return findById(id);
  };

  const remove = (id: string): boolean => {
    const result = db.prepare("DELETE FROM workflow_templates WHERE id = ?").run(id);
    return result.changes > 0;
  };

  const findByProjectId = (projectId: string): WorkflowTemplateRecord[] => {
    return db
      .prepare("SELECT * FROM workflow_templates WHERE project_id = ? ORDER BY created_at DESC")
      .all(projectId) as WorkflowTemplateRecord[];
  };

  return { findAll, findById, create, update, remove, findByProjectId };
}
