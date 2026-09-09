import type { FastifyReply, FastifyRequest } from "fastify";

import type { PaginationQuery } from "../../lib/pagination.js";
import { success } from "../../lib/response.js";
import type { IdParam, ProjectIdParam, TaskIdParam } from "../../lib/schemas.js";
import { currentUserId } from "../../middleware/auth.middleware.js";
import type {
  CreateSubtaskBody,
  CreateTaskBody,
  ListTasksQuery,
  UpdateSubtaskBody,
  UpdateTaskBody
} from "./tasks.schema.js";
import {
  createSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  getTask,
  listSubtasks,
  listTasks,
  updateSubtask,
  updateTask
} from "./tasks.service.js";

export async function create(
  request: FastifyRequest<{ Params: ProjectIdParam; Body: CreateTaskBody }>,
  reply: FastifyReply
) {
  const task = await createTask(
    request.params.projectId,
    currentUserId(request),
    request.body
  );

  return reply.status(201).send(success({ task }, "Task created successfully"));
}

export async function list(
  request: FastifyRequest<{
    Params: ProjectIdParam;
    Querystring: ListTasksQuery;
  }>,
  reply: FastifyReply
) {
  const result = await listTasks(
    request.params.projectId,
    currentUserId(request),
    request.query
  );

  return reply.send(success(result));
}

export async function getOne(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) {
  const task = await getTask(request.params.id, currentUserId(request));

  return reply.send(success({ task }));
}

export async function update(
  request: FastifyRequest<{ Params: IdParam; Body: UpdateTaskBody }>,
  reply: FastifyReply
) {
  const task = await updateTask(
    request.params.id,
    currentUserId(request),
    request.body
  );

  return reply.send(success({ task }, "Task updated successfully"));
}

export async function remove(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) {
  await deleteTask(request.params.id, currentUserId(request));

  return reply.send(success({ id: request.params.id }, "Task deleted successfully"));
}

// --- subtasks ---------------------------------------------------------------

export async function createSub(
  request: FastifyRequest<{ Params: TaskIdParam; Body: CreateSubtaskBody }>,
  reply: FastifyReply
) {
  const subtask = await createSubtask(
    request.params.taskId,
    currentUserId(request),
    request.body
  );

  return reply
    .status(201)
    .send(success({ subtask }, "Subtask created successfully"));
}

export async function listSub(
  request: FastifyRequest<{ Params: TaskIdParam; Querystring: PaginationQuery }>,
  reply: FastifyReply
) {
  const result = await listSubtasks(
    request.params.taskId,
    currentUserId(request),
    request.query
  );

  return reply.send(success(result));
}

export async function updateSub(
  request: FastifyRequest<{ Params: IdParam; Body: UpdateSubtaskBody }>,
  reply: FastifyReply
) {
  const subtask = await updateSubtask(
    request.params.id,
    currentUserId(request),
    request.body
  );

  return reply.send(success({ subtask }, "Subtask updated successfully"));
}

export async function removeSub(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) {
  await deleteSubtask(request.params.id, currentUserId(request));

  return reply.send(
    success({ id: request.params.id }, "Subtask deleted successfully")
  );
}
