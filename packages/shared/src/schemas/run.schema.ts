import { z } from "zod";
import { RunMode, RunStatus } from "../types/domain.js";

export const runSchema = z.object({
  id: z.string(),
  title: z.string(),
  rawRequirement: z.string(),
  mode: z.enum(Object.values(RunMode) as [string, ...string[]]),
  outputLanguage: z.string(),
  status: z.enum(Object.values(RunStatus) as [string, ...string[]]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RunSchema = z.infer<typeof runSchema>;

export const createRunRequestSchema = z.object({
  requirement: z.string().min(1, "Requirement is required"),
  outputLanguage: z.string().optional().default("English"),
  mode: z
    .enum(Object.values(RunMode) as [string, ...string[]])
    .optional()
    .default("docs-only"),
});

export type CreateRunRequest = z.infer<typeof createRunRequestSchema>;
