import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { paginatedSchema } from "../../lib/pagination.js";
import { commonErrorResponses, successSchema } from "../../lib/response.js";
import {
  idParamSchema,
  negotiationIdParamSchema,
  taskIdParamSchema
} from "../../lib/schemas.js";
import {
  createForNegotiation,
  createForTask,
  getOne,
  listForNegotiation,
  listForTask,
  update
} from "./decisions.controller.js";
import {
  createDecisionSchema,
  decisionSchema,
  listDecisionsQuerySchema,
  updateDecisionSchema
} from "./decisions.schema.js";

const singleDecision = z.object({ decision: decisionSchema });

const common = { tags: ["decisions"], security: [{ bearerAuth: [] }] };

/** Mounted at /negotiations/:negotiationId/decisions */
export const negotiationDecisionRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    {
      schema: {
        ...common,
        summary: "Record the decision a negotiation reached",
        params: negotiationIdParamSchema,
        body: createDecisionSchema,
        response: { 201: successSchema(singleDecision), ...commonErrorResponses }
      }
    },
    createForNegotiation
  );

  app.get(
    "/",
    {
      schema: {
        ...common,
        summary: "List a negotiation's decisions",
        params: negotiationIdParamSchema,
        querystring: listDecisionsQuerySchema,
        response: {
          200: successSchema(paginatedSchema(decisionSchema)),
          ...commonErrorResponses
        }
      }
    },
    listForNegotiation
  );
};

/** Mounted at /tasks/:taskId/decisions */
export const taskDecisionRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    {
      schema: {
        ...common,
        summary: "Record a decision against a task directly",
        params: taskIdParamSchema,
        body: createDecisionSchema,
        response: { 201: successSchema(singleDecision), ...commonErrorResponses }
      }
    },
    createForTask
  );

  app.get(
    "/",
    {
      schema: {
        ...common,
        summary: "List a task's decisions",
        params: taskIdParamSchema,
        querystring: listDecisionsQuerySchema,
        response: {
          200: successSchema(paginatedSchema(decisionSchema)),
          ...commonErrorResponses
        }
      }
    },
    listForTask
  );
};

/** Mounted at /decisions */
export const decisionRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Get a decision",
        params: idParamSchema,
        response: { 200: successSchema(singleDecision), ...commonErrorResponses }
      }
    },
    getOne
  );

  app.patch(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Update a decision's status or reasoning",
        params: idParamSchema,
        body: updateDecisionSchema,
        response: { 200: successSchema(singleDecision), ...commonErrorResponses }
      }
    },
    update
  );
};
