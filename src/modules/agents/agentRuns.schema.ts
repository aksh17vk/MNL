import { z } from "zod";

import { paginationQuerySchema } from "../../lib/pagination.js";

export const agentRunStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);

/**
 * The audit trail of which agent worked on what. Phase 1 writes these by hand;
 * the orchestrator will write them later.
 */
export const createAgentRunSchema = z.object({
  agentId: z.uuid("Invalid agent id"),
  subtaskId: z.uuid("Invalid subtask id").optional()
});

export const updateAgentRunSchema = z
  .object({
    status: agentRunStatusSchema,
    error: z.string().max(10_000).nullable()
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const listAgentRunsQuerySchema = paginationQuerySchema.extend({
  status: agentRunStatusSchema.optional(),
  agentId: z.uuid().optional()
});

export const agentRunSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  subtaskId: z.uuid().nullable(),
  agentId: z.uuid(),
  status: agentRunStatusSchema,
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string()
});

export type CreateAgentRunBody = z.infer<typeof createAgentRunSchema>;
export type UpdateAgentRunBody = z.infer<typeof updateAgentRunSchema>;
export type ListAgentRunsQuery = z.infer<typeof listAgentRunsQuerySchema>;
export type AgentRunDto = z.infer<typeof agentRunSchema>;
