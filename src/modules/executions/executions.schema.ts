import { z } from "zod";

import { paginationQuerySchema } from "../../lib/pagination.js";

export const executionStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);

/**
 * Phase 1 records that an execution was requested. Nothing is run — the Docker
 * sandbox arrives with the agent layer.
 */
export const createExecutionSchema = z.object({
  decisionId: z.uuid("Invalid decision id").optional(),
  environment: z.string().trim().max(200).optional()
});

export const updateExecutionSchema = z
  .object({
    status: executionStatusSchema,
    environment: z.string().trim().max(200).nullable()
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const listExecutionsQuerySchema = paginationQuerySchema.extend({
  status: executionStatusSchema.optional()
});

export const executionSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  decisionId: z.uuid().nullable(),
  status: executionStatusSchema,
  environment: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type CreateExecutionBody = z.infer<typeof createExecutionSchema>;
export type UpdateExecutionBody = z.infer<typeof updateExecutionSchema>;
export type ListExecutionsQuery = z.infer<typeof listExecutionsQuerySchema>;
export type ExecutionDto = z.infer<typeof executionSchema>;
