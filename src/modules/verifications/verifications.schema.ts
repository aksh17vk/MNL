import { z } from "zod";

import { paginationQuerySchema } from "../../lib/pagination.js";

export const verificationTypeSchema = z.enum([
  "TYPECHECK",
  "LINT",
  "UNIT_TEST",
  "INTEGRATION_TEST",
  "BUILD",
  "SECURITY_SCAN"
]);

export const verificationStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "PASSED",
  "FAILED",
  "SKIPPED"
]);

/** Phase 1 records the verification; no test runner is invoked. */
export const createVerificationSchema = z.object({
  type: z.string().trim().toUpperCase().pipe(verificationTypeSchema)
});

export const updateVerificationSchema = z
  .object({
    status: verificationStatusSchema,
    output: z.string().max(100_000).nullable()
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const listVerificationsQuerySchema = paginationQuerySchema.extend({
  type: verificationTypeSchema.optional(),
  status: verificationStatusSchema.optional()
});

export const verificationSchema = z.object({
  id: z.uuid(),
  executionId: z.uuid(),
  type: verificationTypeSchema,
  status: verificationStatusSchema,
  output: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type CreateVerificationBody = z.infer<typeof createVerificationSchema>;
export type UpdateVerificationBody = z.infer<typeof updateVerificationSchema>;
export type ListVerificationsQuery = z.infer<
  typeof listVerificationsQuerySchema
>;
export type VerificationDto = z.infer<typeof verificationSchema>;
