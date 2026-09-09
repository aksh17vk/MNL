import { z } from "zod";

import { paginationQuerySchema } from "../../lib/pagination.js";

export const decisionTypeSchema = z.enum([
  "ACCEPT_A",
  "ACCEPT_B",
  "HYBRID",
  "REJECT_BOTH",
  "ESCALATE_HUMAN"
]);

export const decisionStatusSchema = z.enum(["PENDING", "APPLIED", "REVERTED"]);

export const createDecisionSchema = z.object({
  type: z.string().trim().toUpperCase().pipe(decisionTypeSchema),
  reason: z.string().trim().max(5000).optional()
});

export const updateDecisionSchema = z
  .object({
    type: z.string().trim().toUpperCase().pipe(decisionTypeSchema),
    reason: z.string().trim().max(5000).nullable(),
    status: decisionStatusSchema
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const listDecisionsQuerySchema = paginationQuerySchema.extend({
  type: decisionTypeSchema.optional(),
  status: decisionStatusSchema.optional()
});

export const decisionSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  negotiationId: z.uuid().nullable(),
  type: decisionTypeSchema,
  reason: z.string().nullable(),
  status: decisionStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export type CreateDecisionBody = z.infer<typeof createDecisionSchema>;
export type UpdateDecisionBody = z.infer<typeof updateDecisionSchema>;
export type ListDecisionsQuery = z.infer<typeof listDecisionsQuerySchema>;
export type DecisionDto = z.infer<typeof decisionSchema>;
