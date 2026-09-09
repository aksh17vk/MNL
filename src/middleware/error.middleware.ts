import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError
} from "fastify-type-provider-zod";

import { isProduction } from "../config/env.js";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../lib/errors.js";
import { failure } from "../lib/response.js";

/**
 * Single place where anything thrown below the controller becomes the standard
 * error envelope. Controllers and services never format errors themselves.
 */

function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError
): { statusCode: number; code: string; message: string } {
  switch (error.code) {
    case "P2002":
      return {
        statusCode: 409,
        code: "DUPLICATE_RESOURCE",
        message: "A record with these unique values already exists"
      };
    case "P2003":
      return {
        statusCode: 400,
        code: "RELATED_RESOURCE_NOT_FOUND",
        message: "A referenced record does not exist"
      };
    case "P2025":
      return {
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Record not found"
      };
    default:
      return {
        statusCode: 400,
        code: `PRISMA_${error.code}`,
        message: "Database request failed"
      };
  }
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    void reply
      .status(404)
      .send(
        failure(
          "ROUTE_NOT_FOUND",
          `Route ${request.method} ${request.url} does not exist`
        )
      );
  });

  app.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      // Zod request validation
      if (hasZodFastifySchemaValidationErrors(error)) {
        request.log.info({ err: error }, "Request validation failed");

        return reply.status(422).send(
          failure(
            "VALIDATION_ERROR",
            "Request validation failed",
            error.validation.map((issue) => ({
              path: issue.instancePath,
              message: issue.message ?? "Invalid value"
            }))
          )
        );
      }

      // A response did not match its declared schema — always our bug.
      if (isResponseSerializationError(error)) {
        request.log.error({ err: error }, "Response serialization failed");

        return reply
          .status(500)
          .send(failure("INTERNAL_ERROR", "Internal server error"));
      }

      if (error instanceof AppError) {
        if (error.statusCode >= 500) {
          request.log.error({ err: error }, error.message);
        } else {
          request.log.info({ code: error.code }, error.message);
        }

        return reply
          .status(error.statusCode)
          .send(failure(error.code, error.message, error.details));
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const mapped = handlePrismaError(error);
        request.log.error({ err: error }, "Prisma known request error");

        return reply
          .status(mapped.statusCode)
          .send(failure(mapped.code, mapped.message));
      }

      if (error instanceof Prisma.PrismaClientValidationError) {
        request.log.error({ err: error }, "Prisma validation error");

        return reply
          .status(400)
          .send(failure("INVALID_DATABASE_QUERY", "Invalid database query"));
      }

      // Fastify's own errors (rate limit, malformed JSON, ...) carry a status.
      const statusCode = error.statusCode ?? 500;

      if (statusCode < 500) {
        request.log.info({ err: error }, error.message);

        return reply
          .status(statusCode)
          .send(failure(error.code ?? "BAD_REQUEST", error.message));
      }

      request.log.error({ err: error }, "Unhandled error");

      return reply
        .status(500)
        .send(
          failure(
            "INTERNAL_ERROR",
            isProduction ? "Internal server error" : error.message
          )
        );
    }
  );
}
