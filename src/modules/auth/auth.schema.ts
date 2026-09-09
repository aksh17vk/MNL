import { z } from "zod";

export const registerBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.email().trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
});

export const loginBodySchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1, "Password is required")
});

export const publicUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const registerResponseSchema = z.object({
  user: publicUserSchema
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: publicUserSchema
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
