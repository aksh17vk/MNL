import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { paginatedSchema } from "../../lib/pagination.js";
import { commonErrorResponses, successSchema } from "../../lib/response.js";
import { idParamSchema, taskIdParamSchema } from "../../lib/schemas.js";
import { create, getOne, list, update } from "./executions.controller.js";
import {
  createExecutionSchema,
  executionSchema,
  listExecutionsQuerySchema,
  updateExecutionSchema
} from "./executions.schema.js";

const singleExecution = z.object({ execution: executionSchema });

const common = { tags: ["executions"], security: [{ bearerAuth: [] }] };

/** Mounted at /tasks/:taskId/executions */
export const taskExecutionRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    {
      schema: {
        ...common,
        summary: "Record an execution for a task (nothing is run in Phase 1)",
        params: taskIdParamSchema,
        body: createExecutionSchema,
        response: {
          201: successSchema(singleExecution),
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
        summary: "List a task's executions",
        params: taskIdParamSchema,
        querystring: listExecutionsQuerySchema,
        response: {
          200: successSchema(paginatedSchema(executionSchema)),
          ...commonErrorResponses
        }
      }
    },
    list
  );
};

/** Mounted at /executions */
export const executionRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Get an execution",
        params: idParamSchema,
        response: {
          200: successSchema(singleExecution),
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
        summary: "Move an execution through its lifecycle",
        params: idParamSchema,
        body: updateExecutionSchema,
        response: {
          200: successSchema(singleExecution),
          ...commonErrorResponses
        }
      }
    },
    update
  );
};
