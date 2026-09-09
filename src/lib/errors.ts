/**
 * Application error hierarchy.
 *
 * Services throw these; the error middleware turns them into the standard
 * error envelope described in the Phase 1 spec:
 *
 *   { "success": false, "error": { "code": "TASK_NOT_FOUND", "message": "..." } }
 */

export type ErrorDetails = Record<string, unknown> | unknown[];

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: ErrorDetails | undefined;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: ErrorDetails
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", code = "BAD_REQUEST", details?: ErrorDetails) {
    super(400, code, message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Request validation failed", details?: ErrorDetails) {
    super(422, "VALIDATION_ERROR", message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", code = "UNAUTHORIZED") {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource", code = "FORBIDDEN") {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource", code = "NOT_FOUND") {
    super(404, code, `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists", code = "CONFLICT") {
    super(409, code, message);
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal server error") {
    super(500, "INTERNAL_ERROR", message);
  }
}
