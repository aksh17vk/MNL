import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { paginatedSchema } from "../../lib/pagination.js";
import { commonErrorResponses, successSchema } from "../../lib/response.js";
import { idParamSchema, taskIdParamSchema } from "../../lib/schemas.js";
import {
  create,
  createClaimHandler,
  getClaimHandler,
  getOne,
  list,
  listClaimsHandler,
  removeClaimHandler,
  update,
  updateClaimHandler
} from "./negotiations.controller.js";
import {
  claimSchema,
  createClaimSchema,
  listClaimsQuerySchema,
  listNegotiationsQuerySchema,
  negotiationSchema,
  updateClaimSchema,
  updateNegotiationSchema
} from "./negotiations.schema.js";

const singleNegotiation = z.object({ negotiation: negotiationSchema });
const singleClaim = z.object({ claim: claimSchema });

const negotiationTag = {
  tags: ["negotiations"],
  security: [{ bearerAuth: [] }]
};
const claimTag = { tags: ["claims"], security: [{ bearerAuth: [] }] };

/** Mounted at /tasks/:taskId/negotiations */
export const taskNegotiationRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    {
      schema: {
        ...negotiationTag,
        summary: "Open a negotiation for a task (no agents are dispatched)",
        params: taskIdParamSchema,
        response: {
          201: successSchema(singleNegotiation),
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
        ...negotiationTag,
        summary: "List a task's negotiations",
        params: taskIdParamSchema,
        querystring: listNegotiationsQuerySchema,
        response: {
          200: successSchema(paginatedSchema(negotiationSchema)),
          ...commonErrorResponses
        }
      }
    },
    list
  );
};

/** Mounted at /negotiations */
export const negotiationRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/:id",
    {
      schema: {
        ...negotiationTag,
        summary: "Get a negotiation",
        params: idParamSchema,
        response: {
          200: successSchema(singleNegotiation),
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
        ...negotiationTag,
        summary: "Move a negotiation through its lifecycle",
        params: idParamSchema,
        body: updateNegotiationSchema,
        response: {
          200: successSchema(singleNegotiation),
          ...commonErrorResponses
        }
      }
    },
    update
  );

  app.post(
    "/:id/claims",
    {
      schema: {
        ...claimTag,
        summary: "Add a claim to a negotiation",
        params: idParamSchema,
        body: createClaimSchema,
        response: { 201: successSchema(singleClaim), ...commonErrorResponses }
      }
    },
    createClaimHandler
  );

  app.get(
    "/:id/claims",
    {
      schema: {
        ...claimTag,
        summary: "List a negotiation's claims",
        params: idParamSchema,
        querystring: listClaimsQuerySchema,
        response: {
          200: successSchema(paginatedSchema(claimSchema)),
          ...commonErrorResponses
        }
      }
    },
    listClaimsHandler
  );
};

/** Mounted at /claims */
export const claimRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/:id",
    {
      schema: {
        ...claimTag,
        summary: "Get a claim",
        params: idParamSchema,
        response: { 200: successSchema(singleClaim), ...commonErrorResponses }
      }
    },
    getClaimHandler
  );

  app.patch(
    "/:id",
    {
      schema: {
        ...claimTag,
        summary: "Update a claim's content, type or status",
        params: idParamSchema,
        body: updateClaimSchema,
        response: { 200: successSchema(singleClaim), ...commonErrorResponses }
      }
    },
    updateClaimHandler
  );

  app.delete(
    "/:id",
    {
      schema: {
        ...claimTag,
        summary: "Delete a claim that no conflict references",
        params: idParamSchema,
        response: {
          200: successSchema(z.object({ id: z.uuid() })),
          ...commonErrorResponses
        }
      }
    },
    removeClaimHandler
  );
};
