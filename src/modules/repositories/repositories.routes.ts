import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { paginatedSchema } from "../../lib/pagination.js";
import { commonErrorResponses, successSchema } from "../../lib/response.js";
import { idParamSchema, projectIdParamSchema } from "../../lib/schemas.js";
import {
  create,
  getOne,
  list,
  remove,
  update
} from "./repositories.controller.js";
import {
  createRepositorySchema,
  listRepositoriesQuerySchema,
  repositorySchema,
  updateRepositorySchema
} from "./repositories.schema.js";

const singleRepository = z.object({ repository: repositorySchema });

const common = {
  tags: ["repositories"],
  security: [{ bearerAuth: [] }]
};

/** Mounted at /projects/:projectId/repositories */
export const projectRepositoryRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    {
      schema: {
        ...common,
        summary: "Associate a repository with a project",
        params: projectIdParamSchema,
        body: createRepositorySchema,
        response: {
          201: successSchema(singleRepository),
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
        summary: "List a project's repositories",
        params: projectIdParamSchema,
        querystring: listRepositoriesQuerySchema,
        response: {
          200: successSchema(paginatedSchema(repositorySchema)),
          ...commonErrorResponses
        }
      }
    },
    list
  );
};

/** Mounted at /repositories */
export const repositoryRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Get a repository",
        params: idParamSchema,
        response: {
          200: successSchema(singleRepository),
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
        summary: "Update repository metadata",
        params: idParamSchema,
        body: updateRepositorySchema,
        response: {
          200: successSchema(singleRepository),
          ...commonErrorResponses
        }
      }
    },
    update
  );

  app.delete(
    "/:id",
    {
      schema: {
        ...common,
        summary: "Delete a repository",
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
