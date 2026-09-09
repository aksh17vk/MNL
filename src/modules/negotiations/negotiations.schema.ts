import { z } from "zod";

import { paginationQuerySchema } from "../../lib/pagination.js";

export const negotiationStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "COMPLETED",
  "FAILED"
]);

export const claimTypeSchema = z.enum([
  "PROPOSAL",
  "OBSERVATION",
  "HYPOTHESIS",
  "RISK",
  "CONSTRAINT"
]);

export const claimStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "SUPERSEDED"
]);

/**
 * Phase 1 creates the negotiation record; no agents are dispatched. The body is
 * intentionally empty — the task comes from the path.
 */
export const createNegotiationSchema = z.object({}).optional();

export const updateNegotiationSchema = z
  .object({
    status: negotiationStatusSchema
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const listNegotiationsQuerySchema = paginationQuerySchema.extend({
  status: negotiationStatusSchema.optional()
});

export const negotiationSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  status: negotiationStatusSchema,
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// --- claims -----------------------------------------------------------------

export const createClaimSchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(10_000),
  type: claimTypeSchema.default("PROPOSAL"),
  agentRunId: z.uuid("Invalid agent run id").optional()
});

export const updateClaimSchema = z
  .object({
    content: z.string().trim().min(1).max(10_000),
    type: claimTypeSchema,
    status: claimStatusSchema
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const listClaimsQuerySchema = paginationQuerySchema.extend({
  type: claimTypeSchema.optional(),
  status: claimStatusSchema.optional()
});

export const claimSchema = z.object({
  id: z.uuid(),
  negotiationId: z.uuid(),
  agentRunId: z.uuid().nullable(),
  content: z.string(),
  type: claimTypeSchema,
  status: claimStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export type UpdateNegotiationBody = z.infer<typeof updateNegotiationSchema>;
export type ListNegotiationsQuery = z.infer<typeof listNegotiationsQuerySchema>;
export type NegotiationDto = z.infer<typeof negotiationSchema>;
export type CreateClaimBody = z.infer<typeof createClaimSchema>;
export type UpdateClaimBody = z.infer<typeof updateClaimSchema>;
export type ListClaimsQuery = z.infer<typeof listClaimsQuerySchema>;
export type ClaimDto = z.infer<typeof claimSchema>;
