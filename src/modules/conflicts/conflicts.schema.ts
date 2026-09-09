import { z } from "zod";

import { paginationQuerySchema } from "../../lib/pagination.js";

export const conflictTypeSchema = z.enum([
  "FILE_CONFLICT",
  "APPROACH_CONFLICT",
  "SECURITY_CONFLICT",
  "ARCHITECTURE_CONFLICT",
  "EVIDENCE_CONFLICT"
]);

export const conflictStatusSchema = z.enum([
  "OPEN",
  "RESOLVED",
  "ESCALATED",
  "DISMISSED"
]);

export const createConflictSchema = z
  .object({
    claimAId: z.uuid("Invalid claim id"),
    claimBId: z.uuid("Invalid claim id"),
    type: z.string().trim().toUpperCase().pipe(conflictTypeSchema),
    description: z.string().trim().max(5000).optional()
  })
  .refine((value) => value.claimAId !== value.claimBId, {
    message: "A claim cannot conflict with itself",
    path: ["claimBId"]
  });

export const updateConflictSchema = z
  .object({
    type: z.string().trim().toUpperCase().pipe(conflictTypeSchema),
    status: conflictStatusSchema,
    description: z.string().trim().max(5000).nullable()
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const listConflictsQuerySchema = paginationQuerySchema.extend({
  type: conflictTypeSchema.optional(),
  status: conflictStatusSchema.optional()
});

export const conflictSchema = z.object({
  id: z.uuid(),
  negotiationId: z.uuid(),
  claimAId: z.uuid(),
  claimBId: z.uuid(),
  type: conflictTypeSchema,
  status: conflictStatusSchema,
  description: z.string().nullable(),
  createdAt: z.string(),
  resolvedAt: z.string().nullable()
});

export type CreateConflictBody = z.infer<typeof createConflictSchema>;
export type UpdateConflictBody = z.infer<typeof updateConflictSchema>;
export type ListConflictsQuery = z.infer<typeof listConflictsQuerySchema>;
export type ConflictDto = z.infer<typeof conflictSchema>;
