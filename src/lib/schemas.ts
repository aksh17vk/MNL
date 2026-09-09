import { z } from "zod";

/** Path params shared across resources. */
export const idParamSchema = z.object({
  id: z.uuid("Invalid id")
});

export const projectIdParamSchema = z.object({
  projectId: z.uuid("Invalid project id")
});

export const taskIdParamSchema = z.object({
  taskId: z.uuid("Invalid task id")
});

export const negotiationIdParamSchema = z.object({
  negotiationId: z.uuid("Invalid negotiation id")
});

export const claimIdParamSchema = z.object({
  claimId: z.uuid("Invalid claim id")
});

export const executionIdParamSchema = z.object({
  executionId: z.uuid("Invalid execution id")
});

export type IdParam = z.infer<typeof idParamSchema>;
export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
export type TaskIdParam = z.infer<typeof taskIdParamSchema>;
export type NegotiationIdParam = z.infer<typeof negotiationIdParamSchema>;
export type ClaimIdParam = z.infer<typeof claimIdParamSchema>;
export type ExecutionIdParam = z.infer<typeof executionIdParamSchema>;
