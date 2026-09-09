import { z } from "zod";

/** Path params shared across resources. */
export const idParamSchema = z.object({
  id: z.uuid("Invalid id")
});

export const projectIdParamSchema = z.object({
  projectId: z.uuid("Invalid project id")
});

export const taskIdParamSchema = z.object({
  taskId: z.uuid("Invalid task id")
});

export const executionIdParamSchema = z.object({
  executionId: z.uuid("Invalid execution id")
});

export type IdParam = z.infer<typeof idParamSchema>;
export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
export type TaskIdParam = z.infer<typeof taskIdParamSchema>;
export type ExecutionIdParam = z.infer<typeof executionIdParamSchema>;
