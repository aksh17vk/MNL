import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { paginatedSchema, paginationQuerySchema } from "../../lib/pagination.js";
import { commonErrorResponses, successSchema } from "../../lib/response.js";
import {
  idParamSchema,
  projectIdParamSchema,
  taskIdParamSchema
} from "../../lib/schemas.js";
import {
  create,
  createSub,
  getOne,
  list,
  listSub,
  remove,
  removeSub,
  update,
  updateSub
} from "./tasks.controller.js";
import {
  createSubtaskSchema,
  createTaskSchema,
  listTasksQuerySchema,
  subtaskSchema,
  taskSchema,
  updateSubtaskSchema,
  updateTaskSchema
} from "./tasks.schema.js";

const singleTask = z.object({ task: taskSchema });
const singleSubtask = z.object({ subtask: subtaskSchema });

const taskTag = { tags: ["tasks"], security: [{ bearerAuth: [] }] };
const subtaskTag = { tags: ["subtasks"], security: [{ bearerAuth: [] }] };

/** Mounted at /projects/:projectId/tasks */
export const projectTaskRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    {
      schema: {
        ...taskTag,
        summary: "Create a task in a project",
        params: projectIdParamSchema,
        body: createTaskSchema,
        response: { 201: successSchema(singleTask), ...commonErrorResponses }
      }
    },
    create
  );

  app.get(
    "/",
    {
      schema: {
        ...taskTag,
        summary: "List a project's tasks",
        params: projectIdParamSchema,
        querystring: listTasksQuerySchema,
        response: {
          200: successSchema(paginatedSchema(taskSchema)),
          ...commonErrorResponses
        }
      }
    },
    list
  );
};

/** Mounted at /tasks */
export const taskRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/:id",
    {
      schema: {
        ...taskTag,
        summary: "Get a task",
        params: idParamSchema,
        response: { 200: successSchema(singleTask), ...commonErrorResponses }
      }
    },
    getOne
  );

  app.patch(
    "/:id",
    {
      schema: {
        ...taskTag,
        summary: "Update a task's fields, status or priority",
        params: idParamSchema,
        body: updateTaskSchema,
        response: { 200: successSchema(singleTask), ...commonErrorResponses }
      }
    },
    update
  );

  app.delete(
    "/:id",
    {
      schema: {
        ...taskTag,
        summary: "Delete a task and everything under it",
        params: idParamSchema,
        response: {
          200: successSchema(z.object({ id: z.uuid() })),
          ...commonErrorResponses
        }
      }
    },
    remove
  );

  app.post(
    "/:taskId/subtasks",
    {
      schema: {
        ...subtaskTag,
        summary: "Create a subtask",
        params: taskIdParamSchema,
        body: createSubtaskSchema,
        response: { 201: successSchema(singleSubtask), ...commonErrorResponses }
      }
    },
    createSub
  );

  app.get(
    "/:taskId/subtasks",
    {
      schema: {
        ...subtaskTag,
        summary: "List a task's subtasks",
        params: taskIdParamSchema,
        querystring: paginationQuerySchema,
        response: {
          200: successSchema(paginatedSchema(subtaskSchema)),
          ...commonErrorResponses
        }
      }
    },
    listSub
  );
};

/** Mounted at /subtasks */
export const subtaskRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.patch(
    "/:id",
    {
      schema: {
        ...subtaskTag,
        summary: "Update a subtask",
        params: idParamSchema,
        body: updateSubtaskSchema,
        response: { 200: successSchema(singleSubtask), ...commonErrorResponses }
      }
    },
    updateSub
  );

  app.delete(
    "/:id",
    {
      schema: {
        ...subtaskTag,
        summary: "Delete a subtask",
        params: idParamSchema,
        response: {
          200: successSchema(z.object({ id: z.uuid() })),
          ...commonErrorResponses
        }
      }
    },
    removeSub
  );
};
