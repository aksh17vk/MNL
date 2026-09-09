import { prisma } from "../../database/prisma.js";
import type { Evidence, Prisma } from "../../generated/prisma/client.js";
import { NotFoundError } from "../../lib/errors.js";
import { emitEvent } from "../../lib/events.js";
import {
  buildMeta,
  type PaginationMeta,
  toSkipTake
} from "../../lib/pagination.js";
import {
  assertClaimAccess,
  assertNegotiationAccess
} from "../negotiations/negotiations.service.js";
import { taskScope } from "../tasks/tasks.service.js";
import type {
  CreateEvidenceBody,
  EvidenceDto,
  ListEvidenceQuery
} from "./evidence.schema.js";

export function toEvidenceDto(evidence: Evidence): EvidenceDto {
  return {
    id: evidence.id,
    claimId: evidence.claimId,
    type: evidence.type,
    source: evidence.source,
    content: evidence.content,
    location: evidence.location,
    reliability: evidence.reliability,
    createdAt: evidence.createdAt.toISOString()
  };
}

export async function createEvidence(
  claimId: string,
  userId: string,
  input: CreateEvidenceBody
): Promise<EvidenceDto> {
  const claim = await assertClaimAccess(claimId, userId);

  const evidence = await prisma.evidence.create({
    data: {
      claimId,
      type: input.type,
      source: input.source,
      content: input.content,
      location: input.location ?? null,
      reliability: input.reliability
    }
  });

  const dto = toEvidenceDto(evidence);
  const negotiation = await prisma.negotiation.findUnique({
    where: { id: claim.negotiationId },
    select: { taskId: true }
  });

  if (negotiation) {
    emitEvent("evidence.added", {
      ...(await taskScope(negotiation.taskId)),
      evidence: dto
    });
  }

  return dto;
}

export async function listClaimEvidence(
  claimId: string,
  userId: string,
  query: ListEvidenceQuery
): Promise<{ items: EvidenceDto[]; meta: PaginationMeta }> {
  await assertClaimAccess(claimId, userId);

  const where: Prisma.EvidenceWhereInput = {
    claimId,
    ...(query.type ? { type: query.type } : {})
  };

  return paginate(where, query);
}

/** All evidence attached to any claim in a negotiation. */
export async function listNegotiationEvidence(
  negotiationId: string,
  userId: string,
  query: ListEvidenceQuery
): Promise<{ items: EvidenceDto[]; meta: PaginationMeta }> {
  await assertNegotiationAccess(negotiationId, userId);

  const where: Prisma.EvidenceWhereInput = {
    claim: { negotiationId },
    ...(query.type ? { type: query.type } : {})
  };

  return paginate(where, query);
}

export async function getEvidence(
  evidenceId: string,
  userId: string
): Promise<EvidenceDto> {
  const evidence = await prisma.evidence.findFirst({
    where: {
      id: evidenceId,
      claim: { negotiation: { task: { project: { userId } } } }
    }
  });

  if (!evidence) {
    throw new NotFoundError("Evidence", "EVIDENCE_NOT_FOUND");
  }

  return toEvidenceDto(evidence);
}

async function paginate(
  where: Prisma.EvidenceWhereInput,
  query: ListEvidenceQuery
): Promise<{ items: EvidenceDto[]; meta: PaginationMeta }> {
  const [rows, total] = await Promise.all([
    prisma.evidence.findMany({
      where,
      orderBy: { createdAt: "asc" },
      ...toSkipTake(query)
    }),
    prisma.evidence.count({ where })
  ]);

  return { items: rows.map(toEvidenceDto), meta: buildMeta(query, total) };
}
