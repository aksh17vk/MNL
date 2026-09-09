import { prisma } from "../../database/prisma.js";
import type { Claim, Negotiation, Prisma } from "../../generated/prisma/client.js";
import { BadRequestError, NotFoundError } from "../../lib/errors.js";
import {
  buildMeta,
  type PaginationMeta,
  toSkipTake
} from "../../lib/pagination.js";
import { assertTaskAccess } from "../tasks/tasks.service.js";
import type {
  ClaimDto,
  CreateClaimBody,
  ListClaimsQuery,
  ListNegotiationsQuery,
  NegotiationDto,
  UpdateClaimBody,
  UpdateNegotiationBody
} from "./negotiations.schema.js";

export function toNegotiationDto(negotiation: Negotiation): NegotiationDto {
  return {
    id: negotiation.id,
    taskId: negotiation.taskId,
    status: negotiation.status,
    startedAt: negotiation.startedAt?.toISOString() ?? null,
    completedAt: negotiation.completedAt?.toISOString() ?? null,
    createdAt: negotiation.createdAt.toISOString(),
    updatedAt: negotiation.updatedAt.toISOString()
  };
}

export function toClaimDto(claim: Claim): ClaimDto {
  return {
    id: claim.id,
    negotiationId: claim.negotiationId,
    agentRunId: claim.agentRunId,
    content: claim.content,
    type: claim.type,
    status: claim.status,
    createdAt: claim.createdAt.toISOString(),
    updatedAt: claim.updatedAt.toISOString()
  };
}

export async function assertNegotiationAccess(
  negotiationId: string,
  userId: string
): Promise<Negotiation> {
  const negotiation = await prisma.negotiation.findFirst({
    where: { id: negotiationId, task: { project: { userId } } }
  });

  if (!negotiation) {
    throw new NotFoundError("Negotiation", "NEGOTIATION_NOT_FOUND");
  }

  return negotiation;
}

export async function assertClaimAccess(
  claimId: string,
  userId: string
): Promise<Claim> {
  const claim = await prisma.claim.findFirst({
    where: { id: claimId, negotiation: { task: { project: { userId } } } }
  });

  if (!claim) {
    throw new NotFoundError("Claim", "CLAIM_NOT_FOUND");
  }

  return claim;
}

export async function createNegotiation(
  taskId: string,
  userId: string
): Promise<NegotiationDto> {
  await assertTaskAccess(taskId, userId);

  // No agents are dispatched here — Phase 1 only opens the record.
  const negotiation = await prisma.negotiation.create({ data: { taskId } });

  return toNegotiationDto(negotiation);
}

export async function listNegotiations(
  taskId: string,
  userId: string,
  query: ListNegotiationsQuery
): Promise<{ items: NegotiationDto[]; meta: PaginationMeta }> {
  await assertTaskAccess(taskId, userId);

  const where: Prisma.NegotiationWhereInput = {
    taskId,
    ...(query.status ? { status: query.status } : {})
  };

  const [negotiations, total] = await Promise.all([
    prisma.negotiation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query)
    }),
    prisma.negotiation.count({ where })
  ]);

  return {
    items: negotiations.map(toNegotiationDto),
    meta: buildMeta(query, total)
  };
}

export async function getNegotiation(
  negotiationId: string,
  userId: string
): Promise<NegotiationDto> {
  return toNegotiationDto(await assertNegotiationAccess(negotiationId, userId));
}

/** Status drives the started/completed timestamps so callers cannot skew them. */
export async function updateNegotiation(
  negotiationId: string,
  userId: string,
  input: UpdateNegotiationBody
): Promise<NegotiationDto> {
  const existing = await assertNegotiationAccess(negotiationId, userId);
  const now = new Date();

  const data: Prisma.NegotiationUpdateInput = { status: input.status };

  if (input.status === "ACTIVE" && !existing.startedAt) {
    data.startedAt = now;
  }

  if (input.status === "COMPLETED" || input.status === "FAILED") {
    data.completedAt = now;

    if (!existing.startedAt) {
      data.startedAt = now;
    }
  }

  const negotiation = await prisma.negotiation.update({
    where: { id: negotiationId },
    data
  });

  return toNegotiationDto(negotiation);
}

// --- claims -----------------------------------------------------------------

export async function createClaim(
  negotiationId: string,
  userId: string,
  input: CreateClaimBody
): Promise<ClaimDto> {
  await assertNegotiationAccess(negotiationId, userId);

  if (input.agentRunId) {
    const run = await prisma.agentRun.findFirst({
      where: { id: input.agentRunId, task: { project: { userId } } },
      select: { id: true }
    });

    if (!run) {
      throw new NotFoundError("Agent run", "AGENT_RUN_NOT_FOUND");
    }
  }

  const claim = await prisma.claim.create({
    data: {
      negotiationId,
      content: input.content,
      type: input.type,
      agentRunId: input.agentRunId ?? null
    }
  });

  return toClaimDto(claim);
}

export async function listClaims(
  negotiationId: string,
  userId: string,
  query: ListClaimsQuery
): Promise<{ items: ClaimDto[]; meta: PaginationMeta }> {
  await assertNegotiationAccess(negotiationId, userId);

  const where: Prisma.ClaimWhereInput = {
    negotiationId,
    ...(query.type ? { type: query.type } : {}),
    ...(query.status ? { status: query.status } : {})
  };

  const [claims, total] = await Promise.all([
    prisma.claim.findMany({
      where,
      orderBy: { createdAt: "asc" },
      ...toSkipTake(query)
    }),
    prisma.claim.count({ where })
  ]);

  return { items: claims.map(toClaimDto), meta: buildMeta(query, total) };
}

export async function getClaim(
  claimId: string,
  userId: string
): Promise<ClaimDto> {
  return toClaimDto(await assertClaimAccess(claimId, userId));
}

export async function updateClaim(
  claimId: string,
  userId: string,
  input: UpdateClaimBody
): Promise<ClaimDto> {
  await assertClaimAccess(claimId, userId);

  const claim = await prisma.claim.update({
    where: { id: claimId },
    data: {
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.status !== undefined ? { status: input.status } : {})
    }
  });

  return toClaimDto(claim);
}

export async function deleteClaim(
  claimId: string,
  userId: string
): Promise<void> {
  await assertClaimAccess(claimId, userId);

  const conflicts = await prisma.conflict.count({
    where: { OR: [{ claimAId: claimId }, { claimBId: claimId }] }
  });

  if (conflicts > 0) {
    throw new BadRequestError(
      "This claim is referenced by a conflict and cannot be deleted",
      "CLAIM_IN_CONFLICT"
    );
  }

  await prisma.claim.delete({ where: { id: claimId } });
}
