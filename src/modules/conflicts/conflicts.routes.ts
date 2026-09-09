import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { paginatedSchema } from "../../lib/pagination.js";
import { commonErrorResponses, successSchema } from "../../lib/response.js";
import { idParamSchema, negotiationIdParamSchema } from "../../lib/schemas.js";
import { create, getOne, list, update } from "./conflicts.controller.js";
import {
  conflictSchema,
  createConflictSchema,
  listConflictsQuerySchema,
  updateConflictSchema
} from "./conflicts.schema.js";

const singleConflict = z.object({ conflict: conflictSchema });

const common = { tags: ["conflicts"], security: [{ bearerAuth: [] }] };

/** Mounted at /negotiations/:negotiationId/conflicts */
export const negotiationConflictRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    {
      schema: {
        ...common,
        summary: "Record a conflict between two claims",
        params: negotiationIdParamSchema,
        body: createConflictSchema,
        response: { 201: successSchema(singleConflict), ...commonErrorResponses }
      }
    },
    create
  );

  app.get(
    "/",
    {
      schema: {
        ...common,
        summary: "List a negotiation's conflicts",
        params: negotiationIdParamSchema,
        querystring: listConflictsQuerySchema,
        response: {
          200: successSchema(paginatedSchema(conflictSchema)),
          ...commonErrorResponses
        }
      }
    },
    list
  );
};

/** Mounted at /conflicts */
export const conflictRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Get a conflict",
        params: idParamSchema,
        response: { 200: successSchema(singleConflict), ...commonErrorResponses }
      }
    },
    getOne
  );

  app.patch(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Resolve, escalate or dismiss a conflict",
        params: idParamSchema,
        body: updateConflictSchema,
        response: { 200: successSchema(singleConflict), ...commonErrorResponses }
      }
    },
    update
  );
};
