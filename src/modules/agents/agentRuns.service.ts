import { prisma } from "../../database/prisma.js";
import type { AgentRun, Prisma } from "../../generated/prisma/client.js";
import { BadRequestError, NotFoundError } from "../../lib/errors.js";
import {
  buildMeta,
  type PaginationMeta,
  toSkipTake
} from "../../lib/pagination.js";
import { assertTaskAccess } from "../tasks/tasks.service.js";
import { getAgentOrThrow } from "./agents.service.js";
import type {
  AgentRunDto,
  CreateAgentRunBody,
  ListAgentRunsQuery,
  UpdateAgentRunBody
} from "./agentRuns.schema.js";

export function toAgentRunDto(run: AgentRun): AgentRunDto {
  return {
    id: run.id,
    taskId: run.taskId,
    subtaskId: run.subtaskId,
    agentId: run.agentId,
    status: run.status,
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    error: run.error,
    createdAt: run.createdAt.toISOString()
  };
}

export async function assertAgentRunAccess(
  runId: string,
  userId: string
): Promise<AgentRun> {
  const run = await prisma.agentRun.findFirst({
    where: { id: runId, task: { project: { userId } } }
  });

  if (!run) {
    throw new NotFoundError("Agent run", "AGENT_RUN_NOT_FOUND");
  }

  return run;
}

export async function createAgentRun(
  taskId: string,
  userId: string,
  input: CreateAgentRunBody
): Promise<AgentRunDto> {
  await assertTaskAccess(taskId, userId);
  await getAgentOrThrow(input.agentId);

  if (input.subtaskId) {
    const subtask = await prisma.subtask.findFirst({
      where: { id: input.subtaskId, taskId },
      select: { id: true }
    });

    if (!subtask) {
      throw new BadRequestError(
        "Subtask does not belong to this task",
        "SUBTASK_NOT_IN_TASK"
      );
    }
  }

  const run = await prisma.agentRun.create({
    data: {
      taskId,
      agentId: input.agentId,
      subtaskId: input.subtaskId ?? null
    }
  });

  return toAgentRunDto(run);
}

export async function listAgentRuns(
  taskId: string,
  userId: string,
  query: ListAgentRunsQuery
): Promise<{ items: AgentRunDto[]; meta: PaginationMeta }> {
  await assertTaskAccess(taskId, userId);

  const where: Prisma.AgentRunWhereInput = {
    taskId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.agentId ? { agentId: query.agentId } : {})
  };

  const [runs, total] = await Promise.all([
    prisma.agentRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query)
    }),
    prisma.agentRun.count({ where })
  ]);

  return { items: runs.map(toAgentRunDto), meta: buildMeta(query, total) };
}

export async function getAgentRun(
  runId: string,
  userId: string
): Promise<AgentRunDto> {
  return toAgentRunDto(await assertAgentRunAccess(runId, userId));
}

export async function updateAgentRun(
  runId: string,
  userId: string,
  input: UpdateAgentRunBody
): Promise<AgentRunDto> {
  const existing = await assertAgentRunAccess(runId, userId);
  const now = new Date();

  const data: Prisma.AgentRunUpdateInput = {
    ...(input.error !== undefined ? { error: input.error } : {})
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

  const run = await prisma.agentRun.update({ where: { id: runId }, data });

  return toAgentRunDto(run);
}
