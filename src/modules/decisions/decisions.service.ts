import { prisma } from "../../database/prisma.js";
import type { Decision, Prisma } from "../../generated/prisma/client.js";
import { NotFoundError } from "../../lib/errors.js";
import {
  buildMeta,
  type PaginationMeta,
  toSkipTake
} from "../../lib/pagination.js";
import { assertNegotiationAccess } from "../negotiations/negotiations.service.js";
import { assertTaskAccess } from "../tasks/tasks.service.js";
import type {
  CreateDecisionBody,
  DecisionDto,
  ListDecisionsQuery,
  UpdateDecisionBody
} from "./decisions.schema.js";

export function toDecisionDto(decision: Decision): DecisionDto {
  return {
    id: decision.id,
    taskId: decision.taskId,
    negotiationId: decision.negotiationId,
    type: decision.type,
    reason: decision.reason,
    status: decision.status,
    createdAt: decision.createdAt.toISOString(),
    updatedAt: decision.updatedAt.toISOString()
  };
}

export async function assertDecisionAccess(
  decisionId: string,
  userId: string
): Promise<Decision> {
  const decision = await prisma.decision.findFirst({
    where: { id: decisionId, task: { project: { userId } } }
  });

  if (!decision) {
    throw new NotFoundError("Decision", "DECISION_NOT_FOUND");
  }

  return decision;
}

/** Filed against a negotiation; the task is taken from that negotiation. */
export async function createNegotiationDecision(
  negotiationId: string,
  userId: string,
  input: CreateDecisionBody
): Promise<DecisionDto> {
  const negotiation = await assertNegotiationAccess(negotiationId, userId);

  const decision = await prisma.decision.create({
    data: {
      taskId: negotiation.taskId,
      negotiationId,
      type: input.type,
      reason: input.reason ?? null
    }
  });

  return toDecisionDto(decision);
}

/** Filed straight against a task, with no negotiation behind it. */
export async function createTaskDecision(
  taskId: string,
  userId: string,
  input: CreateDecisionBody
): Promise<DecisionDto> {
  await assertTaskAccess(taskId, userId);

  const decision = await prisma.decision.create({
    data: {
      taskId,
      type: input.type,
      reason: input.reason ?? null
    }
  });

  return toDecisionDto(decision);
}

export async function listNegotiationDecisions(
  negotiationId: string,
  userId: string,
  query: ListDecisionsQuery
): Promise<{ items: DecisionDto[]; meta: PaginationMeta }> {
  await assertNegotiationAccess(negotiationId, userId);

  return paginate(
    {
      negotiationId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {})
    },
    query
  );
}

export async function listTaskDecisions(
  taskId: string,
  userId: string,
  query: ListDecisionsQuery
): Promise<{ items: DecisionDto[]; meta: PaginationMeta }> {
  await assertTaskAccess(taskId, userId);

  return paginate(
    {
      taskId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {})
    },
    query
  );
}

export async function getDecision(
  decisionId: string,
  userId: string
): Promise<DecisionDto> {
  return toDecisionDto(await assertDecisionAccess(decisionId, userId));
}

export async function updateDecision(
  decisionId: string,
  userId: string,
  input: UpdateDecisionBody
): Promise<DecisionDto> {
  await assertDecisionAccess(decisionId, userId);

  const decision = await prisma.decision.update({
    where: { id: decisionId },
    data: {
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      ...(input.status !== undefined ? { status: input.status } : {})
    }
  });

  return toDecisionDto(decision);
}

async function paginate(
  where: Prisma.DecisionWhereInput,
  query: ListDecisionsQuery
): Promise<{ items: DecisionDto[]; meta: PaginationMeta }> {
  const [rows, total] = await Promise.all([
    prisma.decision.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query)
    }),
    prisma.decision.count({ where })
  ]);

  return { items: rows.map(toDecisionDto), meta: buildMeta(query, total) };
}
