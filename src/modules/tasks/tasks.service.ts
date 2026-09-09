import { prisma } from "../../database/prisma.js";
import type { Prisma, Subtask, Task } from "../../generated/prisma/client.js";
import { BadRequestError, NotFoundError } from "../../lib/errors.js";
import { emitEvent } from "../../lib/events.js";
import {
  buildMeta,
  type PaginationMeta,
  type PaginationQuery,
  toSkipTake
} from "../../lib/pagination.js";
import { assertProjectAccess } from "../projects/projects.service.js";
import type {
  CreateSubtaskBody,
  CreateTaskBody,
  ListTasksQuery,
  SubtaskDto,
  TaskDto,
  UpdateSubtaskBody,
  UpdateTaskBody
} from "./tasks.schema.js";

export function toTaskDto(task: Task): TaskDto {
  return {
    id: task.id,
    projectId: task.projectId,
    repositoryId: task.repositoryId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    createdBy: task.createdBy,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
}

export function toSubtaskDto(subtask: Subtask): SubtaskDto {
  return {
    id: subtask.id,
    taskId: subtask.taskId,
    title: subtask.title,
    description: subtask.description,
    status: subtask.status,
    assignedAgentId: subtask.assignedAgentId,
    createdAt: subtask.createdAt.toISOString(),
    updatedAt: subtask.updatedAt.toISOString()
  };
}

/** Routing hints for a domain event about this task. */
export async function taskScope(
  taskId: string
): Promise<{ taskId: string; projectId?: string }> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true }
  });

  return task ? { taskId, projectId: task.projectId } : { taskId };
}

/** A task is reachable only through a project the user owns. */
export async function assertTaskAccess(
  taskId: string,
  userId: string
): Promise<Task> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { userId } }
  });

  if (!task) {
    throw new NotFoundError("Task", "TASK_NOT_FOUND");
  }

  return task;
}

/** A repository may only be attached to a task inside the same project. */
async function assertRepositoryInProject(
  repositoryId: string,
  projectId: string
): Promise<void> {
  const repository = await prisma.repository.findFirst({
    where: { id: repositoryId, projectId },
    select: { id: true }
  });

  if (!repository) {
    throw new BadRequestError(
      "Repository does not belong to this project",
      "REPOSITORY_NOT_IN_PROJECT"
    );
  }
}

export async function createTask(
  projectId: string,
  userId: string,
  input: CreateTaskBody
): Promise<TaskDto> {
  await assertProjectAccess(projectId, userId);

  if (input.repositoryId) {
    await assertRepositoryInProject(input.repositoryId, projectId);
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      repositoryId: input.repositoryId ?? null,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      createdBy: userId
    }
  });

  const dto = toTaskDto(task);
  emitEvent("task.created", { projectId, taskId: task.id, task: dto });

  return dto;
}

export async function listTasks(
  projectId: string,
  userId: string,
  query: ListTasksQuery
): Promise<{ items: TaskDto[]; meta: PaginationMeta }> {
  await assertProjectAccess(projectId, userId);

  const where: Prisma.TaskWhereInput = {
    projectId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.repositoryId ? { repositoryId: query.repositoryId } : {})
  };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(query)
    }),
    prisma.task.count({ where })
  ]);

  return { items: tasks.map(toTaskDto), meta: buildMeta(query, total) };
}

export async function getTask(taskId: string, userId: string): Promise<TaskDto> {
  return toTaskDto(await assertTaskAccess(taskId, userId));
}

export async function updateTask(
  taskId: string,
  userId: string,
  input: UpdateTaskBody
): Promise<TaskDto> {
  const existing = await assertTaskAccess(taskId, userId);

  if (input.repositoryId) {
    await assertRepositoryInProject(input.repositoryId, existing.projectId);
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.repositoryId !== undefined
        ? { repositoryId: input.repositoryId }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {})
    }
  });

  const dto = toTaskDto(task);
  emitEvent("task.updated", {
    projectId: task.projectId,
    taskId: task.id,
    task: dto
  });

  return dto;
}

export async function deleteTask(taskId: string, userId: string): Promise<void> {
  await assertTaskAccess(taskId, userId);

  await prisma.task.delete({ where: { id: taskId } });
}

// --- subtasks ---------------------------------------------------------------

export async function assertSubtaskAccess(
  subtaskId: string,
  userId: string
): Promise<Subtask> {
  const subtask = await prisma.subtask.findFirst({
    where: { id: subtaskId, task: { project: { userId } } }
  });

  if (!subtask) {
    throw new NotFoundError("Subtask", "SUBTASK_NOT_FOUND");
  }

  return subtask;
}

async function assertAgentExists(agentId: string): Promise<void> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true }
  });

  if (!agent) {
    throw new NotFoundError("Agent", "AGENT_NOT_FOUND");
  }
}

export async function createSubtask(
  taskId: string,
  userId: string,
  input: CreateSubtaskBody
): Promise<SubtaskDto> {
  await assertTaskAccess(taskId, userId);

  if (input.assignedAgentId) {
    await assertAgentExists(input.assignedAgentId);
  }

  const subtask = await prisma.subtask.create({
    data: {
      taskId,
      title: input.title,
      description: input.description ?? null,
      assignedAgentId: input.assignedAgentId ?? null
    }
  });

  return toSubtaskDto(subtask);
}

export async function listSubtasks(
  taskId: string,
  userId: string,
  query: PaginationQuery
): Promise<{ items: SubtaskDto[]; meta: PaginationMeta }> {
  await assertTaskAccess(taskId, userId);

  const where: Prisma.SubtaskWhereInput = { taskId };

  const [subtasks, total] = await Promise.all([
    prisma.subtask.findMany({
      where,
      orderBy: { createdAt: "asc" },
      ...toSkipTake(query)
    }),
    prisma.subtask.count({ where })
  ]);

  return { items: subtasks.map(toSubtaskDto), meta: buildMeta(query, total) };
}

export async function updateSubtask(
  subtaskId: string,
  userId: string,
  input: UpdateSubtaskBody
): Promise<SubtaskDto> {
  await assertSubtaskAccess(subtaskId, userId);

  if (input.assignedAgentId) {
    await assertAgentExists(input.assignedAgentId);
  }

  const subtask = await prisma.subtask.update({
    where: { id: subtaskId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.assignedAgentId !== undefined
        ? { assignedAgentId: input.assignedAgentId }
        : {})
    }
  });

  return toSubtaskDto(subtask);
}

export async function deleteSubtask(
  subtaskId: string,
  userId: string
): Promise<void> {
  await assertSubtaskAccess(subtaskId, userId);

  await prisma.subtask.delete({ where: { id: subtaskId } });
}
