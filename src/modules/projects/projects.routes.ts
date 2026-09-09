import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { paginatedSchema } from "../../lib/pagination.js";
import { commonErrorResponses, successSchema } from "../../lib/response.js";
import { idParamSchema } from "../../lib/schemas.js";
import { create, getOne, list, remove, update } from "./projects.controller.js";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectSchema,
  updateProjectSchema
} from "./projects.schema.js";

const singleProject = z.object({ project: projectSchema });

export const projectRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  const common = {
    tags: ["projects"],
    security: [{ bearerAuth: [] }]
  };

  app.post(
    "/",
    {
      schema: {
        ...common,
        summary: "Create a project",
        body: createProjectSchema,
        response: { 201: successSchema(singleProject), ...commonErrorResponses }
      }
    },
    create
  );

  app.get(
    "/",
    {
      schema: {
        ...common,
        summary: "List the projects you own",
        querystring: listProjectsQuerySchema,
        response: {
          200: successSchema(paginatedSchema(projectSchema)),
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
        summary: "Get a project",
        params: idParamSchema,
        response: { 200: successSchema(singleProject), ...commonErrorResponses }
      }
    },
    getOne
  );

  app.patch(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Update a project",
        params: idParamSchema,
        body: updateProjectSchema,
        response: { 200: successSchema(singleProject), ...commonErrorResponses }
      }
    },
    update
  );

  app.delete(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Delete a project and everything under it",
        params: idParamSchema,
        response: {
          200: successSchema(z.object({ id: z.uuid() })),
          ...commonErrorResponses
        }
      }
    },
    remove
  );
};
