import type { FastifyReply, FastifyRequest } from "fastify";

import { success } from "../../lib/response.js";
import type {
  IdParam,
  NegotiationIdParam,
  TaskIdParam
} from "../../lib/schemas.js";
import { currentUserId } from "../../middleware/auth.middleware.js";
import type {
  CreateDecisionBody,
  ListDecisionsQuery,
  UpdateDecisionBody
} from "./decisions.schema.js";
import {
  createNegotiationDecision,
  createTaskDecision,
  getDecision,
  listNegotiationDecisions,
  listTaskDecisions,
  updateDecision
} from "./decisions.service.js";

export async function createForNegotiation(
  request: FastifyRequest<{
    Params: NegotiationIdParam;
    Body: CreateDecisionBody;
  }>,
  reply: FastifyReply
) {
  const decision = await createNegotiationDecision(
    request.params.negotiationId,
    currentUserId(request),
    request.body
  );

  return reply
    .status(201)
    .send(success({ decision }, "Decision recorded successfully"));
}

export async function listForNegotiation(
  request: FastifyRequest<{
    Params: NegotiationIdParam;
    Querystring: ListDecisionsQuery;
  }>,
  reply: FastifyReply
) {
  const result = await listNegotiationDecisions(
    request.params.negotiationId,
    currentUserId(request),
    request.query
  );

  return reply.send(success(result));
}

export async function createForTask(
  request: FastifyRequest<{ Params: TaskIdParam; Body: CreateDecisionBody }>,
  reply: FastifyReply
) {
  const decision = await createTaskDecision(
    request.params.taskId,
    currentUserId(request),
    request.body
  );

  return reply
    .status(201)
    .send(success({ decision }, "Decision recorded successfully"));
}

export async function listForTask(
  request: FastifyRequest<{
    Params: TaskIdParam;
    Querystring: ListDecisionsQuery;
  }>,
  reply: FastifyReply
) {
  const result = await listTaskDecisions(
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
  const decision = await getDecision(request.params.id, currentUserId(request));

  return reply.send(success({ decision }));
}

export async function update(
  request: FastifyRequest<{ Params: IdParam; Body: UpdateDecisionBody }>,
  reply: FastifyReply
) {
  const decision = await updateDecision(
    request.params.id,
    currentUserId(request),
    request.body
  );

  return reply.send(success({ decision }, "Decision updated successfully"));
}
