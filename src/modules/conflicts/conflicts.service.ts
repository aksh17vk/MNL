import { prisma } from "../../database/prisma.js";
import type { Conflict, Prisma } from "../../generated/prisma/client.js";
import { BadRequestError, NotFoundError } from "../../lib/errors.js";
import { emitEvent } from "../../lib/events.js";
import {
  buildMeta,
  type PaginationMeta,
  toSkipTake
} from "../../lib/pagination.js";
import { assertNegotiationAccess } from "../negotiations/negotiations.service.js";
import { taskScope } from "../tasks/tasks.service.js";
import type {
  ConflictDto,
  CreateConflictBody,
  ListConflictsQuery,
  UpdateConflictBody
} from "./conflicts.schema.js";

export function toConflictDto(conflict: Conflict): ConflictDto {
  return {
    id: conflict.id,
    negotiationId: conflict.negotiationId,
    claimAId: conflict.claimAId,
    claimBId: conflict.claimBId,
    type: conflict.type,
    status: conflict.status,
    description: conflict.description,
    createdAt: conflict.createdAt.toISOString(),
    resolvedAt: conflict.resolvedAt?.toISOString() ?? null
  };
}

export async function assertConflictAccess(
  conflictId: string,
  userId: string
): Promise<Conflict> {
  const conflict = await prisma.conflict.findFirst({
    where: { id: conflictId, negotiation: { task: { project: { userId } } } }
  });

  if (!conflict) {
    throw new NotFoundError("Conflict", "CONFLICT_NOT_FOUND");
  }

  return conflict;
}

export async function createConflict(
  negotiationId: string,
  userId: string,
  input: CreateConflictBody
): Promise<ConflictDto> {
  const negotiation = await assertNegotiationAccess(negotiationId, userId);

  // Both claims must belong to the negotiation the conflict is filed under.
  const claims = await prisma.claim.findMany({
    where: { id: { in: [input.claimAId, input.claimBId] }, negotiationId },
    select: { id: true }
  });

  if (claims.length !== 2) {
    throw new BadRequestError(
      "Both claims must belong to this negotiation",
      "CLAIM_NOT_IN_NEGOTIATION"
    );
  }

  const conflict = await prisma.conflict.create({
    data: {
      negotiationId,
      claimAId: input.claimAId,
      claimBId: input.claimBId,
      type: input.type,
      description: input.description ?? null
    }
  });

  const dto = toConflictDto(conflict);
  emitEvent("conflict.detected", {
    ...(await taskScope(negotiation.taskId)),
    conflict: dto
  });

  return dto;
}

export async function listConflicts(
  negotiationId: string,
  userId: string,
  query: ListConflictsQuery
): Promise<{ items: ConflictDto[]; meta: PaginationMeta }> {
  await assertNegotiationAccess(negotiationId, userId);

  const where: Prisma.ConflictWhereInput = {
    negotiationId,
    ...(query.type ? { type: query.type } : {}),
    ...(query.status ? { status: query.status } : {})
  };

  const [conflicts, total] = await Promise.all([
    prisma.conflict.findMany({
      where,
      orderBy: { createdAt: "asc" },
      ...toSkipTake(query)
    }),
    prisma.conflict.count({ where })
  ]);

  return { items: conflicts.map(toConflictDto), meta: buildMeta(query, total) };
}

export async function getConflict(
  conflictId: string,
  userId: string
): Promise<ConflictDto> {
  return toConflictDto(await assertConflictAccess(conflictId, userId));
}

/** Leaving OPEN clears resolvedAt again, so the record never lies. */
export async function updateConflict(
  conflictId: string,
  userId: string,
  input: UpdateConflictBody
): Promise<ConflictDto> {
  const existing = await assertConflictAccess(conflictId, userId);

  const data: Prisma.ConflictUpdateInput = {
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.description !== undefined
      ? { description: input.description }
      : {})
  };

  if (input.status !== undefined) {
    data.status = input.status;
    data.resolvedAt = input.status === "OPEN" ? null : new Date();
  }

  const conflict = await prisma.conflict.update({
    where: { id: conflictId },
    data
  });
  const dto = toConflictDto(conflict);

  if (input.status !== undefined && input.status !== "OPEN") {
    const negotiation = await prisma.negotiation.findUnique({
      where: { id: existing.negotiationId },
      select: { taskId: true }
    });

    if (negotiation) {
      emitEvent("conflict.resolved", {
        ...(await taskScope(negotiation.taskId)),
        conflict: dto
      });
    }
  }

  return dto;
}
