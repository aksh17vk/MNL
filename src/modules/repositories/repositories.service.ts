import { prisma } from "../../database/prisma.js";
import type { Prisma, Repository } from "../../generated/prisma/client.js";
import { NotFoundError } from "../../lib/errors.js";
import {
  buildMeta,
  type PaginationMeta,
  toSkipTake
} from "../../lib/pagination.js";
import { assertProjectAccess } from "../projects/projects.service.js";
import type {
  CreateRepositoryBody,
  ListRepositoriesQuery,
  RepositoryDto,
  UpdateRepositoryBody
} from "./repositories.schema.js";

export function toRepositoryDto(repository: Repository): RepositoryDto {
  return {
    id: repository.id,
    projectId: repository.projectId,
    name: repository.name,
    provider: repository.provider,
    url: repository.url,
    defaultBranch: repository.defaultBranch,
    status: repository.status,
    createdAt: repository.createdAt.toISOString(),
    updatedAt: repository.updatedAt.toISOString()
  };
}

/** A repository is reachable only through a project the user owns. */
export async function assertRepositoryAccess(
  repositoryId: string,
  userId: string
): Promise<Repository> {
  const repository = await prisma.repository.findFirst({
    where: { id: repositoryId, project: { userId } }
  });

  if (!repository) {
    throw new NotFoundError("Repository", "REPOSITORY_NOT_FOUND");
  }

  return repository;
}

export async function createRepository(
  projectId: string,
  userId: string,
  input: CreateRepositoryBody
): Promise<RepositoryDto> {
  await assertProjectAccess(projectId, userId);

  const repository = await prisma.repository.create({
    data: {
      projectId,
      name: input.name,
      provider: input.provider,
      url: input.url,
      defaultBranch: input.defaultBranch
    }
  });

  return toRepositoryDto(repository);
}

export async function listRepositories(
  projectId: string,
  userId: string,
  query: ListRepositoriesQuery
): Promise<{ items: RepositoryDto[]; meta: PaginationMeta }> {
  await assertProjectAccess(projectId, userId);

  const where: Prisma.RepositoryWhereInput = {
    projectId,
    ...(query.provider ? { provider: query.provider } : {}),
    ...(query.status ? { status: query.status } : {})
  };

  const [repositories, total] = await Promise.all([
    prisma.repository.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query)
    }),
    prisma.repository.count({ where })
  ]);

  return {
    items: repositories.map(toRepositoryDto),
    meta: buildMeta(query, total)
  };
}

export async function getRepository(
  repositoryId: string,
  userId: string
): Promise<RepositoryDto> {
  return toRepositoryDto(await assertRepositoryAccess(repositoryId, userId));
}

export async function updateRepository(
  repositoryId: string,
  userId: string,
  input: UpdateRepositoryBody
): Promise<RepositoryDto> {
  await assertRepositoryAccess(repositoryId, userId);

  const repository = await prisma.repository.update({
    where: { id: repositoryId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.provider !== undefined ? { provider: input.provider } : {}),
      ...(input.url !== undefined ? { url: input.url } : {}),
      ...(input.defaultBranch !== undefined
        ? { defaultBranch: input.defaultBranch }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {})
    }
  });

  return toRepositoryDto(repository);
}

export async function deleteRepository(
  repositoryId: string,
  userId: string
): Promise<void> {
  await assertRepositoryAccess(repositoryId, userId);

  await prisma.repository.delete({ where: { id: repositoryId } });
}
