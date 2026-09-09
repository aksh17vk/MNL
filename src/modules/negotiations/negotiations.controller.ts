import type { FastifyReply, FastifyRequest } from "fastify";

import { success } from "../../lib/response.js";
import type { IdParam, TaskIdParam } from "../../lib/schemas.js";
import { currentUserId } from "../../middleware/auth.middleware.js";
import type {
  CreateClaimBody,
  ListClaimsQuery,
  ListNegotiationsQuery,
  UpdateClaimBody,
  UpdateNegotiationBody
} from "./negotiations.schema.js";
import {
  createClaim,
  createNegotiation,
  deleteClaim,
  getClaim,
  getNegotiation,
  listClaims,
  listNegotiations,
  updateClaim,
  updateNegotiation
} from "./negotiations.service.js";

export async function create(
  request: FastifyRequest<{ Params: TaskIdParam }>,
  reply: FastifyReply
) {
  const negotiation = await createNegotiation(
    request.params.taskId,
    currentUserId(request)
  );

  return reply
    .status(201)
    .send(success({ negotiation }, "Negotiation created successfully"));
}

export async function list(
  request: FastifyRequest<{
    Params: TaskIdParam;
    Querystring: ListNegotiationsQuery;
  }>,
  reply: FastifyReply
) {
  const result = await listNegotiations(
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
  const negotiation = await getNegotiation(
    request.params.id,
    currentUserId(request)
  );

  return reply.send(success({ negotiation }));
}

export async function update(
  request: FastifyRequest<{ Params: IdParam; Body: UpdateNegotiationBody }>,
  reply: FastifyReply
) {
  const negotiation = await updateNegotiation(
    request.params.id,
    currentUserId(request),
    request.body
  );

  return reply.send(success({ negotiation }, "Negotiation updated successfully"));
}

// --- claims -----------------------------------------------------------------

export async function createClaimHandler(
  request: FastifyRequest<{ Params: IdParam; Body: CreateClaimBody }>,
  reply: FastifyReply
) {
  const claim = await createClaim(
    request.params.id,
    currentUserId(request),
    request.body
  );

  return reply.status(201).send(success({ claim }, "Claim created successfully"));
}

export async function listClaimsHandler(
  request: FastifyRequest<{ Params: IdParam; Querystring: ListClaimsQuery }>,
  reply: FastifyReply
) {
  const result = await listClaims(
    request.params.id,
    currentUserId(request),
    request.query
  );

  return reply.send(success(result));
}

export async function getClaimHandler(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) {
  const claim = await getClaim(request.params.id, currentUserId(request));

  return reply.send(success({ claim }));
}

export async function updateClaimHandler(
  request: FastifyRequest<{ Params: IdParam; Body: UpdateClaimBody }>,
  reply: FastifyReply
) {
  const claim = await updateClaim(
    request.params.id,
    currentUserId(request),
    request.body
  );

  return reply.send(success({ claim }, "Claim updated successfully"));
}

export async function removeClaimHandler(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) {
  await deleteClaim(request.params.id, currentUserId(request));

  return reply.send(success({ id: request.params.id }, "Claim deleted successfully"));
}
