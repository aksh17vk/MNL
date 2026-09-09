import { prisma } from "../../database/prisma.js";
import type { Prisma, Project } from "../../generated/prisma/client.js";
import { NotFoundError } from "../../lib/errors.js";
import {
  buildMeta,
  type PaginationMeta,
  toSkipTake
} from "../../lib/pagination.js";
import type {
  CreateProjectBody,
  ListProjectsQuery,
  ProjectDto,
  UpdateProjectBody
} from "./projects.schema.js";

export function toProjectDto(project: Project): ProjectDto {
  return {
    id: project.id,
    userId: project.userId,
    name: project.name,
    description: project.description,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  };
}

/**
 * Loads a project the user owns. Every project-scoped resource funnels through
 * here so ownership is enforced in exactly one place.
 */
export async function assertProjectAccess(
  projectId: string,
  userId: string
): Promise<Project> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId }
  });

  if (!project) {
    throw new NotFoundError("Project", "PROJECT_NOT_FOUND");
  }

  return project;
}

export async function createProject(
  userId: string,
  input: CreateProjectBody
): Promise<ProjectDto> {
  const project = await prisma.project.create({
    data: {
      userId,
      name: input.name,
      description: input.description ?? null
    }
  });

  return toProjectDto(project);
}

export async function listProjects(
  userId: string,
  query: ListProjectsQuery
): Promise<{ items: ProjectDto[]; meta: PaginationMeta }> {
  const where: Prisma.ProjectWhereInput = {
    userId,
    ...(query.status ? { status: query.status } : {})
  };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query)
    }),
    prisma.project.count({ where })
  ]);

  return { items: projects.map(toProjectDto), meta: buildMeta(query, total) };
}

export async function getProject(
  projectId: string,
  userId: string
): Promise<ProjectDto> {
  return toProjectDto(await assertProjectAccess(projectId, userId));
}

export async function updateProject(
  projectId: string,
  userId: string,
  input: UpdateProjectBody
): Promise<ProjectDto> {
  await assertProjectAccess(projectId, userId);

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {})
    }
  });

  return toProjectDto(project);
}

export async function deleteProject(
  projectId: string,
  userId: string
): Promise<void> {
  await assertProjectAccess(projectId, userId);

  await prisma.project.delete({ where: { id: projectId } });
}
