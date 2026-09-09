import type { FastifyReply, FastifyRequest } from "fastify";

import { success } from "../../lib/response.js";
import type { IdParam, ProjectIdParam } from "../../lib/schemas.js";
import { currentUserId } from "../../middleware/auth.middleware.js";
import type {
  CreateRepositoryBody,
  ListRepositoriesQuery,
  UpdateRepositoryBody
} from "./repositories.schema.js";
import {
  createRepository,
  deleteRepository,
  getRepository,
  listRepositories,
  updateRepository
} from "./repositories.service.js";

export async function create(
  request: FastifyRequest<{
    Params: ProjectIdParam;
    Body: CreateRepositoryBody;
  }>,
  reply: FastifyReply
) {
  const repository = await createRepository(
    request.params.projectId,
    currentUserId(request),
    request.body
  );

  return reply
    .status(201)
    .send(success({ repository }, "Repository created successfully"));
}

export async function list(
  request: FastifyRequest<{
    Params: ProjectIdParam;
    Querystring: ListRepositoriesQuery;
  }>,
  reply: FastifyReply
) {
  const result = await listRepositories(
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
  const repository = await getRepository(
    request.params.id,
    currentUserId(request)
  );

  return reply.send(success({ repository }));
}

export async function update(
  request: FastifyRequest<{ Params: IdParam; Body: UpdateRepositoryBody }>,
  reply: FastifyReply
) {
  const repository = await updateRepository(
    request.params.id,
    currentUserId(request),
    request.body
  );

  return reply.send(success({ repository }, "Repository updated successfully"));
}

export async function remove(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) {
  await deleteRepository(request.params.id, currentUserId(request));

  return reply.send(
    success({ id: request.params.id }, "Repository deleted successfully")
  );
}
