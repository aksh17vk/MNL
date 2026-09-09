import type { FastifyReply, FastifyRequest } from "fastify";

import { success } from "../../lib/response.js";
import type { IdParam, TaskIdParam } from "../../lib/schemas.js";
import { currentUserId } from "../../middleware/auth.middleware.js";
import type {
  CreateExecutionBody,
  ListExecutionsQuery,
  UpdateExecutionBody
} from "./executions.schema.js";
import {
  createExecution,
  getExecution,
  listExecutions,
  updateExecution
} from "./executions.service.js";

export async function create(
  request: FastifyRequest<{ Params: TaskIdParam; Body: CreateExecutionBody }>,
  reply: FastifyReply
) {
  const execution = await createExecution(
    request.params.taskId,
    currentUserId(request),
    request.body
  );

  return reply
    .status(201)
    .send(success({ execution }, "Execution created successfully"));
}

export async function list(
  request: FastifyRequest<{
    Params: TaskIdParam;
    Querystring: ListExecutionsQuery;
  }>,
  reply: FastifyReply
) {
  const result = await listExecutions(
    request.params.taskId,
    currentUserId(request),
    request.query
  );

  return reply.send(success(result));
}

export async function getOne(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) {
  const execution = await getExecution(request.params.id, currentUserId(request));

  return reply.send(success({ execution }));
}

export async function update(
  request: FastifyRequest<{ Params: IdParam; Body: UpdateExecutionBody }>,
  reply: FastifyReply
) {
  const execution = await updateExecution(
    request.params.id,
    currentUserId(request),
    request.body
  );

  return reply.send(success({ execution }, "Execution updated successfully"));
}
