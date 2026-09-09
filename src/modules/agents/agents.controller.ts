import type { FastifyReply, FastifyRequest } from "fastify";

import { success } from "../../lib/response.js";
import type { IdParam } from "../../lib/schemas.js";
import type {
  CreateAgentBody,
  ListAgentsQuery,
  UpdateAgentBody
} from "./agents.schema.js";
import {
  createAgent,
  getAgent,
  listAgents,
  updateAgent
} from "./agents.service.js";

export async function create(
  request: FastifyRequest<{ Body: CreateAgentBody }>,
  reply: FastifyReply
) {
  const agent = await createAgent(request.body);

  return reply
    .status(201)
    .send(success({ agent }, "Agent registered successfully"));
}

export async function list(
  request: FastifyRequest<{ Querystring: ListAgentsQuery }>,
  reply: FastifyReply
) {
  return reply.send(success(await listAgents(request.query)));
}

export async function getOne(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) {
  return reply.send(success({ agent: await getAgent(request.params.id) }));
}

export async function update(
  request: FastifyRequest<{ Params: IdParam; Body: UpdateAgentBody }>,
  reply: FastifyReply
) {
  const agent = await updateAgent(request.params.id, request.body);

  return reply.send(success({ agent }, "Agent updated successfully"));
}
