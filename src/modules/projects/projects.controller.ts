import type { FastifyReply, FastifyRequest } from "fastify";

import { success } from "../../lib/response.js";
import type { IdParam } from "../../lib/schemas.js";
import { currentUserId } from "../../middleware/auth.middleware.js";
import type {
  CreateProjectBody,
  ListProjectsQuery,
  UpdateProjectBody
} from "./projects.schema.js";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject
} from "./projects.service.js";

export async function create(
  request: FastifyRequest<{ Body: CreateProjectBody }>,
  reply: FastifyReply
) {
  const project = await createProject(currentUserId(request), request.body);

  return reply
    .status(201)
    .send(success({ project }, "Project created successfully"));
}

export async function list(
  request: FastifyRequest<{ Querystring: ListProjectsQuery }>,
  reply: FastifyReply
) {
  const result = await listProjects(currentUserId(request), request.query);

  return reply.send(success(result));
}

export async function getOne(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) {
  const project = await getProject(request.params.id, currentUserId(request));

  return reply.send(success({ project }));
}

export async function update(
  request: FastifyRequest<{ Params: IdParam; Body: UpdateProjectBody }>,
  reply: FastifyReply
) {
  const project = await updateProject(
    request.params.id,
    currentUserId(request),
    request.body
  );

  return reply.send(success({ project }, "Project updated successfully"));
}

export async function remove(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) {
  await deleteProject(request.params.id, currentUserId(request));

  return reply.send(success({ id: request.params.id }, "Project deleted successfully"));
}
