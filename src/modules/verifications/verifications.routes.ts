import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { paginatedSchema } from "../../lib/pagination.js";
import { commonErrorResponses, successSchema } from "../../lib/response.js";
import { executionIdParamSchema, idParamSchema } from "../../lib/schemas.js";
import { create, getOne, list, update } from "./verifications.controller.js";
import {
  createVerificationSchema,
  listVerificationsQuerySchema,
  updateVerificationSchema,
  verificationSchema
} from "./verifications.schema.js";

const singleVerification = z.object({ verification: verificationSchema });

const common = { tags: ["verifications"], security: [{ bearerAuth: [] }] };

/** Mounted at /executions/:executionId/verifications */
export const executionVerificationRoutes: FastifyPluginAsyncZod = async (
  app
) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    {
      schema: {
        ...common,
        summary: "Record a verification (no runner is invoked in Phase 1)",
        params: executionIdParamSchema,
        body: createVerificationSchema,
        response: {
          201: successSchema(singleVerification),
          ...commonErrorResponses
        }
      }
    },
    create
  );

  app.get(
    "/",
    {
      schema: {
        ...common,
        summary: "List an execution's verifications",
        params: executionIdParamSchema,
        querystring: listVerificationsQuerySchema,
        response: {
          200: successSchema(paginatedSchema(verificationSchema)),
          ...commonErrorResponses
        }
      }
    },
    list
  );
};

/** Mounted at /verifications */
export const verificationRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Get a verification",
        params: idParamSchema,
        response: {
          200: successSchema(singleVerification),
          ...commonErrorResponses
        }
      }
    },
    getOne
  );

  app.patch(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Record a verification's result",
        params: idParamSchema,
        body: updateVerificationSchema,
        response: {
          200: successSchema(singleVerification),
          ...commonErrorResponses
        }
      }
    },
    update
  );
};
