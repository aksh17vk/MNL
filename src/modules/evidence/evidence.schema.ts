import { z } from "zod";

import { paginationQuerySchema } from "../../lib/pagination.js";

export const evidenceTypeSchema = z.enum([
  "CODE",
  "TEST",
  "RUNTIME",
  "GIT",
  "STATIC_ANALYSIS",
  "DOCUMENTATION"
]);

/**
 * Evidence is supplied by hand in Phase 1 — automatic collection from the
 * repository comes with the agent layer.
 */
export const createEvidenceSchema = z.object({
  type: z.string().trim().toUpperCase().pipe(evidenceTypeSchema),
  source: z.string().trim().min(1, "Source is required").max(300),
  content: z.string().trim().min(1, "Content is required").max(20_000),
  location: z.string().trim().max(500).optional(),
  reliability: z.coerce.number().min(0).max(1).default(0.5)
});

export const listEvidenceQuerySchema = paginationQuerySchema.extend({
  type: evidenceTypeSchema.optional()
});

export const evidenceSchema = z.object({
  id: z.uuid(),
  claimId: z.uuid(),
  type: evidenceTypeSchema,
  source: z.string(),
  content: z.string(),
  location: z.string().nullable(),
  reliability: z.number(),
  createdAt: z.string()
});

export type CreateEvidenceBody = z.infer<typeof createEvidenceSchema>;
export type ListEvidenceQuery = z.infer<typeof listEvidenceQuerySchema>;
export type EvidenceDto = z.infer<typeof evidenceSchema>;
