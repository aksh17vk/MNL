import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { paginatedSchema } from "../../lib/pagination.js";
import { commonErrorResponses, successSchema } from "../../lib/response.js";
import { idParamSchema, taskIdParamSchema } from "../../lib/schemas.js";
import { create, getOne, list, update } from "./agentRuns.controller.js";
import {
  agentRunSchema,
  createAgentRunSchema,
  listAgentRunsQuerySchema,
  updateAgentRunSchema
} from "./agentRuns.schema.js";

const singleRun = z.object({ agentRun: agentRunSchema });

const common = { tags: ["agent-runs"], security: [{ bearerAuth: [] }] };

/** Mounted at /tasks/:taskId/agent-runs */
export const taskAgentRunRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    {
      schema: {
        ...common,
        summary: "Record that an agent was put on a task",
        params: taskIdParamSchema,
        body: createAgentRunSchema,
        response: { 201: successSchema(singleRun), ...commonErrorResponses }
      }
    },
    create
  );

  app.get(
    "/",
    {
      schema: {
        ...common,
        summary: "List a task's agent runs",
        params: taskIdParamSchema,
        querystring: listAgentRunsQuerySchema,
        response: {
          200: successSchema(paginatedSchema(agentRunSchema)),
          ...commonErrorResponses
        }
      }
    },
    list
  );
};

/** Mounted at /agent-runs */
export const agentRunRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Get an agent run",
        params: idParamSchema,
        response: { 200: successSchema(singleRun), ...commonErrorResponses }
      }
    },
    getOne
  );

  app.patch(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Move an agent run through its lifecycle",
        params: idParamSchema,
        body: updateAgentRunSchema,
        response: { 200: successSchema(singleRun), ...commonErrorResponses }
      }
    },
    update
  );
};
