import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { paginatedSchema } from "../../lib/pagination.js";
import { commonErrorResponses, successSchema } from "../../lib/response.js";
import {
  claimIdParamSchema,
  idParamSchema,
  negotiationIdParamSchema
} from "../../lib/schemas.js";
import {
  create,
  getOne,
  listForClaim,
  listForNegotiation
} from "./evidence.controller.js";
import {
  createEvidenceSchema,
  evidenceSchema,
  listEvidenceQuerySchema
} from "./evidence.schema.js";

const singleEvidence = z.object({ evidence: evidenceSchema });

const common = { tags: ["evidence"], security: [{ bearerAuth: [] }] };

/** Mounted at /claims/:claimId/evidence */
export const claimEvidenceRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    {
      schema: {
        ...common,
        summary: "Attach evidence to a claim",
        params: claimIdParamSchema,
        body: createEvidenceSchema,
        response: { 201: successSchema(singleEvidence), ...commonErrorResponses }
      }
    },
    create
  );

  app.get(
    "/",
    {
      schema: {
        ...common,
        summary: "List a claim's evidence",
        params: claimIdParamSchema,
        querystring: listEvidenceQuerySchema,
        response: {
          200: successSchema(paginatedSchema(evidenceSchema)),
          ...commonErrorResponses
        }
      }
    },
    listForClaim
  );
};

/** Mounted at /negotiations/:negotiationId/evidence */
export const negotiationEvidenceRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/",
    {
      schema: {
        ...common,
        summary: "List every piece of evidence in a negotiation",
        params: negotiationIdParamSchema,
        querystring: listEvidenceQuerySchema,
        response: {
          200: successSchema(paginatedSchema(evidenceSchema)),
          ...commonErrorResponses
        }
      }
    },
    listForNegotiation
  );
};

/** Mounted at /evidence */
export const evidenceRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Get a single piece of evidence",
        params: idParamSchema,
        response: { 200: successSchema(singleEvidence), ...commonErrorResponses }
      }
    },
    getOne
  );
};
