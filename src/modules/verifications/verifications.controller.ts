import type { FastifyReply, FastifyRequest } from "fastify";

import { success } from "../../lib/response.js";
import type { ExecutionIdParam, IdParam } from "../../lib/schemas.js";
import { currentUserId } from "../../middleware/auth.middleware.js";
import type {
  CreateVerificationBody,
  ListVerificationsQuery,
  UpdateVerificationBody
} from "./verifications.schema.js";
import {
  createVerification,
  getVerification,
  listVerifications,
  updateVerification
} from "./verifications.service.js";

export async function create(
  request: FastifyRequest<{
    Params: ExecutionIdParam;
    Body: CreateVerificationBody;
  }>,
  reply: FastifyReply
) {
  const verification = await createVerification(
    request.params.executionId,
    currentUserId(request),
    request.body
  );

  return reply
    .status(201)
    .send(success({ verification }, "Verification created successfully"));
}

export async function list(
  request: FastifyRequest<{
    Params: ExecutionIdParam;
    Querystring: ListVerificationsQuery;
  }>,
  reply: FastifyReply
) {
  const result = await listVerifications(
    request.params.executionId,
    currentUserId(request),
    request.query
  );

  return reply.send(success(result));
}

export async function getOne(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) {
  const verification = await getVerification(
    request.params.id,
    currentUserId(request)
  );

  return reply.send(success({ verification }));
}

export async function update(
  request: FastifyRequest<{ Params: IdParam; Body: UpdateVerificationBody }>,
  reply: FastifyReply
) {
  const verification = await updateVerification(
    request.params.id,
    currentUserId(request),
    request.body
  );

  return reply.send(
    success({ verification }, "Verification updated successfully")
  );
}
