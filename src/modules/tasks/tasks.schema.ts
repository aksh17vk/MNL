import { z } from "zod";

import { paginationQuerySchema } from "../../lib/pagination.js";

export const taskStatusSchema = z.enum([
  "PENDING",
  "PLANNING",
  "IN_PROGRESS",
  "WAITING",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);

export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const subtaskStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(10_000).optional(),
  repositoryId: z.uuid("Invalid repository id").optional(),
  priority: taskPrioritySchema.default("MEDIUM")
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().max(10_000).nullable(),
    repositoryId: z.uuid("Invalid repository id").nullable(),
    status: taskStatusSchema,
    priority: taskPrioritySchema
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const listTasksQuerySchema = paginationQuerySchema.extend({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  repositoryId: z.uuid().optional()
});

export const taskSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  repositoryId: z.uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  createdBy: z.uuid(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// --- subtasks ---------------------------------------------------------------

export const createSubtaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(10_000).optional(),
  assignedAgentId: z.uuid("Invalid agent id").optional()
});

export const updateSubtaskSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().max(10_000).nullable(),
    status: subtaskStatusSchema,
    assignedAgentId: z.uuid("Invalid agent id").nullable()
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const subtaskSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: subtaskStatusSchema,
  assignedAgentId: z.uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type CreateTaskBody = z.infer<typeof createTaskSchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type TaskDto = z.infer<typeof taskSchema>;
export type CreateSubtaskBody = z.infer<typeof createSubtaskSchema>;
export type UpdateSubtaskBody = z.infer<typeof updateSubtaskSchema>;
export type SubtaskDto = z.infer<typeof subtaskSchema>;
