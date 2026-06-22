import { z } from "zod";
import { RunMode, RunStatus } from "../types/domain.js";

export const runSchema = z.object({
  id: z.string(),
  requirement: z.string(),
  mode: z.enum(Object.values(RunMode) as [string, ...string[]]),
  status: z.enum(Object.values(RunStatus) as [string, ...string[]]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RunSchema = z.infer<typeof runSchema>;
