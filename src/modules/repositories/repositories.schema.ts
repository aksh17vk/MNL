import { z } from "zod";

import { paginationQuerySchema } from "../../lib/pagination.js";

export const repositoryProviderSchema = z.enum([
  "GITHUB",
  "GITLAB",
  "BITBUCKET",
  "LOCAL"
]);

export const repositoryStatusSchema = z.enum([
  "CONNECTED",
  "DISCONNECTED",
  "ERROR"
]);

/**
 * Phase 1 stores repository metadata only — nothing is cloned, so the URL is
 * validated for shape and left alone.
 */
export const createRepositorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  provider: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(repositoryProviderSchema),
  url: z.string().trim().min(1, "URL is required").max(500),
  defaultBranch: z.string().trim().min(1).max(200).default("main")
});

export const updateRepositorySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    provider: z.string().trim().toUpperCase().pipe(repositoryProviderSchema),
    url: z.string().trim().min(1).max(500),
    defaultBranch: z.string().trim().min(1).max(200),
    status: repositoryStatusSchema
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const listRepositoriesQuerySchema = paginationQuerySchema.extend({
  provider: repositoryProviderSchema.optional(),
  status: repositoryStatusSchema.optional()
});

export const repositorySchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  name: z.string(),
  provider: repositoryProviderSchema,
  url: z.string(),
  defaultBranch: z.string(),
  status: repositoryStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export type CreateRepositoryBody = z.infer<typeof createRepositorySchema>;
export type UpdateRepositoryBody = z.infer<typeof updateRepositorySchema>;
export type ListRepositoriesQuery = z.infer<typeof listRepositoriesQuerySchema>;
export type RepositoryDto = z.infer<typeof repositorySchema>;
