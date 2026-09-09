import { prisma } from "../../database/prisma.js";
import type { Execution, Prisma } from "../../generated/prisma/client.js";
import { BadRequestError, NotFoundError } from "../../lib/errors.js";
import {
  buildMeta,
  type PaginationMeta,
  toSkipTake
} from "../../lib/pagination.js";
import { assertTaskAccess } from "../tasks/tasks.service.js";
import type {
  CreateExecutionBody,
  ExecutionDto,
  ListExecutionsQuery,
  UpdateExecutionBody
} from "./executions.schema.js";

export function toExecutionDto(execution: Execution): ExecutionDto {
  return {
    id: execution.id,
    taskId: execution.taskId,
    decisionId: execution.decisionId,
    status: execution.status,
    environment: execution.environment,
    startedAt: execution.startedAt?.toISOString() ?? null,
    completedAt: execution.completedAt?.toISOString() ?? null,
    createdAt: execution.createdAt.toISOString(),
    updatedAt: execution.updatedAt.toISOString()
  };
}

export async function assertExecutionAccess(
  executionId: string,
  userId: string
): Promise<Execution> {
  const execution = await prisma.execution.findFirst({
    where: { id: executionId, task: { project: { userId } } }
  });

  if (!execution) {
    throw new NotFoundError("Execution", "EXECUTION_NOT_FOUND");
  }

  return execution;
}

export async function createExecution(
  taskId: string,
  userId: string,
  input: CreateExecutionBody
): Promise<ExecutionDto> {
  await assertTaskAccess(taskId, userId);

  if (input.decisionId) {
    const decision = await prisma.decision.findFirst({
      where: { id: input.decisionId, taskId },
      select: { id: true }
    });

    if (!decision) {
      throw new BadRequestError(
        "Decision does not belong to this task",
        "DECISION_NOT_IN_TASK"
      );
    }
  }

  // No code runs here — the record is the deliverable in Phase 1.
  const execution = await prisma.execution.create({
    data: {
      taskId,
      decisionId: input.decisionId ?? null,
      environment: input.environment ?? null
    }
  });

  return toExecutionDto(execution);
}

export async function listExecutions(
  taskId: string,
  userId: string,
  query: ListExecutionsQuery
): Promise<{ items: ExecutionDto[]; meta: PaginationMeta }> {
  await assertTaskAccess(taskId, userId);

  const where: Prisma.ExecutionWhereInput = {
    taskId,
    ...(query.status ? { status: query.status } : {})
  };

  const [executions, total] = await Promise.all([
    prisma.execution.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query)
    }),
    prisma.execution.count({ where })
  ]);

  return {
    items: executions.map(toExecutionDto),
    meta: buildMeta(query, total)
  };
}

export async function getExecution(
  executionId: string,
  userId: string
): Promise<ExecutionDto> {
  return toExecutionDto(await assertExecutionAccess(executionId, userId));
}

export async function updateExecution(
  executionId: string,
  userId: string,
  input: UpdateExecutionBody
): Promise<ExecutionDto> {
  const existing = await assertExecutionAccess(executionId, userId);
  const now = new Date();

  const data: Prisma.ExecutionUpdateInput = {
    ...(input.environment !== undefined
      ? { environment: input.environment }
      : {})
  };

  if (input.status !== undefined) {
    data.status = input.status;

    if (input.status === "RUNNING" && !existing.startedAt) {
      data.startedAt = now;
    }

    if (
      input.status === "COMPLETED" ||
      input.status === "FAILED" ||
      input.status === "CANCELLED"
    ) {
      data.completedAt = now;

      if (!existing.startedAt) {
        data.startedAt = now;
      }
    }
  }

  const execution = await prisma.execution.update({
    where: { id: executionId },
    data
  });

  return toExecutionDto(execution);
}
