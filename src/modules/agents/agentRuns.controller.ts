import type { FastifyReply, FastifyRequest } from "fastify";

import { success } from "../../lib/response.js";
import type { IdParam, TaskIdParam } from "../../lib/schemas.js";
import { currentUserId } from "../../middleware/auth.middleware.js";
import type {
  CreateAgentRunBody,
  ListAgentRunsQuery,
  UpdateAgentRunBody
} from "./agentRuns.schema.js";
import {
  createAgentRun,
  getAgentRun,
  listAgentRuns,
  updateAgentRun
} from "./agentRuns.service.js";

export async function create(
  request: FastifyRequest<{ Params: TaskIdParam; Body: CreateAgentRunBody }>,
  reply: FastifyReply
) {
  const agentRun = await createAgentRun(
    request.params.taskId,
    currentUserId(request),
    request.body
  );

  return reply
    .status(201)
    .send(success({ agentRun }, "Agent run created successfully"));
}

export async function list(
  request: FastifyRequest<{
    Params: TaskIdParam;
    Querystring: ListAgentRunsQuery;
  }>,
  reply: FastifyReply
) {
  const result = await listAgentRuns(
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
  const agentRun = await getAgentRun(request.params.id, currentUserId(request));

  return reply.send(success({ agentRun }));
}

export async function update(
  request: FastifyRequest<{ Params: IdParam; Body: UpdateAgentRunBody }>,
  reply: FastifyReply
) {
  const agentRun = await updateAgentRun(
    request.params.id,
    currentUserId(request),
    request.body
  );

  return reply.send(success({ agentRun }, "Agent run updated successfully"));
}
