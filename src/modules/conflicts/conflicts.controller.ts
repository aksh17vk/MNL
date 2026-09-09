import type { FastifyReply, FastifyRequest } from "fastify";

import { success } from "../../lib/response.js";
import type { IdParam, NegotiationIdParam } from "../../lib/schemas.js";
import { currentUserId } from "../../middleware/auth.middleware.js";
import type {
  CreateConflictBody,
  ListConflictsQuery,
  UpdateConflictBody
} from "./conflicts.schema.js";
import {
  createConflict,
  getConflict,
  listConflicts,
  updateConflict
} from "./conflicts.service.js";

export async function create(
  request: FastifyRequest<{
    Params: NegotiationIdParam;
    Body: CreateConflictBody;
  }>,
  reply: FastifyReply
) {
  const conflict = await createConflict(
    request.params.negotiationId,
    currentUserId(request),
    request.body
  );

  return reply
    .status(201)
    .send(success({ conflict }, "Conflict recorded successfully"));
}

export async function list(
  request: FastifyRequest<{
    Params: NegotiationIdParam;
    Querystring: ListConflictsQuery;
  }>,
  reply: FastifyReply
) {
  const result = await listConflicts(
    request.params.negotiationId,
    currentUserId(request),
    request.query
  );

  return reply.send(success(result));
}

export async function getOne(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) {
  const conflict = await getConflict(request.params.id, currentUserId(request));

  return reply.send(success({ conflict }));
}

export async function update(
  request: FastifyRequest<{ Params: IdParam; Body: UpdateConflictBody }>,
  reply: FastifyReply
) {
  const conflict = await updateConflict(
    request.params.id,
    currentUserId(request),
    request.body
  );

  return reply.send(success({ conflict }, "Conflict updated successfully"));
}
