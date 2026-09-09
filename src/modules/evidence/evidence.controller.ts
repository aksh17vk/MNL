import type { FastifyReply, FastifyRequest } from "fastify";

import { success } from "../../lib/response.js";
import type {
  ClaimIdParam,
  IdParam,
  NegotiationIdParam
} from "../../lib/schemas.js";
import { currentUserId } from "../../middleware/auth.middleware.js";
import type {
  CreateEvidenceBody,
  ListEvidenceQuery
} from "./evidence.schema.js";
import {
  createEvidence,
  getEvidence,
  listClaimEvidence,
  listNegotiationEvidence
} from "./evidence.service.js";

export async function create(
  request: FastifyRequest<{ Params: ClaimIdParam; Body: CreateEvidenceBody }>,
  reply: FastifyReply
) {
  const evidence = await createEvidence(
    request.params.claimId,
    currentUserId(request),
    request.body
  );

  return reply
    .status(201)
    .send(success({ evidence }, "Evidence added successfully"));
}

export async function listForClaim(
  request: FastifyRequest<{
    Params: ClaimIdParam;
    Querystring: ListEvidenceQuery;
  }>,
  reply: FastifyReply
) {
  const result = await listClaimEvidence(
    request.params.claimId,
    currentUserId(request),
    request.query
  );

  return reply.send(success(result));
}

export async function listForNegotiation(
  request: FastifyRequest<{
    Params: NegotiationIdParam;
    Querystring: ListEvidenceQuery;
  }>,
  reply: FastifyReply
) {
  const result = await listNegotiationEvidence(
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
  const evidence = await getEvidence(request.params.id, currentUserId(request));

  return reply.send(success({ evidence }));
}
