import { z } from "zod";

/**
 * Every endpoint answers with the same envelope (spec section 19), so the
 * future frontend never has to special-case a route.
 */

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function success<T>(data: T, message?: string): SuccessResponse<T> {
  return message === undefined
    ? { success: true, data }
    : { success: true, data, message };
}

export function failure(
  code: string,
  message: string,
  details?: unknown
): ErrorResponse {
  return details === undefined
    ? { success: false, error: { code, message } }
    : { success: false, error: { code, message, details } };
}

/** Wraps a payload schema in the success envelope, for OpenAPI generation. */
export function successSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.literal(true),
    data,
    message: z.string().optional()
  });
}

export const errorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  })
});

/** Shared error responses attached to every documented route. */
export const commonErrorResponses = {
  400: errorSchema,
  401: errorSchema,
  403: errorSchema,
  404: errorSchema,
  409: errorSchema,
  422: errorSchema,
  500: errorSchema
};
