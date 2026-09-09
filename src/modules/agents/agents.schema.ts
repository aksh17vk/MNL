import { z } from "zod";

import { paginationQuerySchema } from "../../lib/pagination.js";

export const agentTypeSchema = z.enum([
  "BACKEND",
  "FRONTEND",
  "SECURITY",
  "QA",
  "DATABASE",
  "DEVOPS",
  "ARCHITECTURE",
  "GENERAL"
]);

export const agentStatusSchema = z.enum(["ACTIVE", "INACTIVE", "DISABLED"]);

/**
 * A registry entry, not a running agent. Phase 1 stores what an agent *would*
 * be able to do; nothing executes.
 */
export const createAgentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  type: z.string().trim().toUpperCase().pipe(agentTypeSchema),
  description: z.string().trim().max(2000).optional(),
  capabilities: z
    .array(z.string().trim().min(1).max(80))
    .max(50)
    .default([])
});

export const updateAgentSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    type: z.string().trim().toUpperCase().pipe(agentTypeSchema),
    description: z.string().trim().max(2000).nullable(),
    status: agentStatusSchema,
    capabilities: z.array(z.string().trim().min(1).max(80)).max(50)
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const listAgentsQuerySchema = paginationQuerySchema.extend({
  type: agentTypeSchema.optional(),
  status: agentStatusSchema.optional()
});

export const agentSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: agentTypeSchema,
  description: z.string().nullable(),
  status: agentStatusSchema,
  capabilities: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type CreateAgentBody = z.infer<typeof createAgentSchema>;
export type UpdateAgentBody = z.infer<typeof updateAgentSchema>;
export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;
export type AgentDto = z.infer<typeof agentSchema>;
