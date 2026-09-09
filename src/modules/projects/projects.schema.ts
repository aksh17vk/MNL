import { z } from "zod";

import { paginationQuerySchema } from "../../lib/pagination.js";

export const projectStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(2000).optional()
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).nullable(),
    status: projectStatusSchema
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  status: projectStatusSchema.optional()
});

export const projectSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  status: projectStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export type CreateProjectBody = z.infer<typeof createProjectSchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type ProjectDto = z.infer<typeof projectSchema>;
