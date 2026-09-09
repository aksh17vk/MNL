import { prisma } from "../../database/prisma.js";
import type { Prisma, Verification } from "../../generated/prisma/client.js";
import { NotFoundError } from "../../lib/errors.js";
import { emitEvent } from "../../lib/events.js";
import {
  buildMeta,
  type PaginationMeta,
  toSkipTake
} from "../../lib/pagination.js";
import { assertExecutionAccess } from "../executions/executions.service.js";
import { taskScope } from "../tasks/tasks.service.js";
import type {
  CreateVerificationBody,
  ListVerificationsQuery,
  UpdateVerificationBody,
  VerificationDto
} from "./verifications.schema.js";

export function toVerificationDto(
  verification: Verification
): VerificationDto {
  return {
    id: verification.id,
    executionId: verification.executionId,
    type: verification.type,
    status: verification.status,
    output: verification.output,
    startedAt: verification.startedAt?.toISOString() ?? null,
    completedAt: verification.completedAt?.toISOString() ?? null,
    createdAt: verification.createdAt.toISOString(),
    updatedAt: verification.updatedAt.toISOString()
  };
}

export async function assertVerificationAccess(
  verificationId: string,
  userId: string
): Promise<Verification> {
  const verification = await prisma.verification.findFirst({
    where: {
      id: verificationId,
      execution: { task: { project: { userId } } }
    }
  });

  if (!verification) {
    throw new NotFoundError("Verification", "VERIFICATION_NOT_FOUND");
  }

  return verification;
}

export async function createVerification(
  executionId: string,
  userId: string,
  input: CreateVerificationBody
): Promise<VerificationDto> {
  await assertExecutionAccess(executionId, userId);

  const verification = await prisma.verification.create({
    data: { executionId, type: input.type }
  });

  return toVerificationDto(verification);
}

export async function listVerifications(
  executionId: string,
  userId: string,
  query: ListVerificationsQuery
): Promise<{ items: VerificationDto[]; meta: PaginationMeta }> {
  await assertExecutionAccess(executionId, userId);

  const where: Prisma.VerificationWhereInput = {
    executionId,
    ...(query.type ? { type: query.type } : {}),
    ...(query.status ? { status: query.status } : {})
  };

  const [verifications, total] = await Promise.all([
    prisma.verification.findMany({
      where,
      orderBy: { createdAt: "asc" },
      ...toSkipTake(query)
    }),
    prisma.verification.count({ where })
  ]);

  return {
    items: verifications.map(toVerificationDto),
    meta: buildMeta(query, total)
  };
}

export async function getVerification(
  verificationId: string,
  userId: string
): Promise<VerificationDto> {
  return toVerificationDto(
    await assertVerificationAccess(verificationId, userId)
  );
}

export async function updateVerification(
  verificationId: string,
  userId: string,
  input: UpdateVerificationBody
): Promise<VerificationDto> {
  const existing = await assertVerificationAccess(verificationId, userId);
  const now = new Date();

  const data: Prisma.VerificationUpdateInput = {
    ...(input.output !== undefined ? { output: input.output } : {})
  };

  if (input.status !== undefined) {
    data.status = input.status;

    if (input.status === "RUNNING" && !existing.startedAt) {
      data.startedAt = now;
    }

    if (
      input.status === "PASSED" ||
      input.status === "FAILED" ||
      input.status === "SKIPPED"
    ) {
      data.completedAt = now;

      if (!existing.startedAt) {
        data.startedAt = now;
      }
    }
  }

  const verification = await prisma.verification.update({
    where: { id: verificationId },
    data
  });
  const dto = toVerificationDto(verification);

  if (
    input.status === "PASSED" ||
    input.status === "FAILED" ||
    input.status === "SKIPPED"
  ) {
    const execution = await prisma.execution.findUnique({
      where: { id: verification.executionId },
      select: { taskId: true }
    });

    if (execution) {
      emitEvent("verification.completed", {
        ...(await taskScope(execution.taskId)),
        verification: dto
      });
    }
  }

  return dto;
}
