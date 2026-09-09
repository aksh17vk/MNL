import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { paginatedSchema } from "../../lib/pagination.js";
import { commonErrorResponses, successSchema } from "../../lib/response.js";
import { idParamSchema } from "../../lib/schemas.js";
import { create, getOne, list, update } from "./agents.controller.js";
import {
  agentSchema,
  createAgentSchema,
  listAgentsQuerySchema,
  updateAgentSchema
} from "./agents.schema.js";

const singleAgent = z.object({ agent: agentSchema });

const common = { tags: ["agents"], security: [{ bearerAuth: [] }] };

export const agentRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    {
      schema: {
        ...common,
        summary: "Register an agent",
        body: createAgentSchema,
        response: { 201: successSchema(singleAgent), ...commonErrorResponses }
      }
    },
    create
  );

  app.get(
    "/",
    {
      schema: {
        ...common,
        summary: "List registered agents",
        querystring: listAgentsQuerySchema,
        response: {
          200: successSchema(paginatedSchema(agentSchema)),
          ...commonErrorResponses
        }
      }
    },
    list
  );

  app.get(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Get an agent",
        params: idParamSchema,
        response: { 200: successSchema(singleAgent), ...commonErrorResponses }
      }
    },
    getOne
  );

  app.patch(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Update an agent's metadata or status",
        params: idParamSchema,
        body: updateAgentSchema,
        response: { 200: successSchema(singleAgent), ...commonErrorResponses }
      }
    },
    update
  );
};
