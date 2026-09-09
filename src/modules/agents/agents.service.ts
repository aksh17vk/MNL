import { prisma } from "../../database/prisma.js";
import type { Agent, Prisma } from "../../generated/prisma/client.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import {
  buildMeta,
  type PaginationMeta,
  toSkipTake
} from "../../lib/pagination.js";
import type {
  AgentDto,
  CreateAgentBody,
  ListAgentsQuery,
  UpdateAgentBody
} from "./agents.schema.js";

export function toAgentDto(agent: Agent): AgentDto {
  return {
    id: agent.id,
    name: agent.name,
    type: agent.type,
    description: agent.description,
    status: agent.status,
    capabilities: agent.capabilities,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString()
  };
}

/** The registry is shared infrastructure, so agents are not user-scoped. */
export async function getAgentOrThrow(agentId: string): Promise<Agent> {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });

  if (!agent) {
    throw new NotFoundError("Agent", "AGENT_NOT_FOUND");
  }

  return agent;
}

export async function createAgent(input: CreateAgentBody): Promise<AgentDto> {
  const existing = await prisma.agent.findUnique({
    where: { name: input.name },
    select: { id: true }
  });

  if (existing) {
    throw new ConflictError(
      "An agent with this name already exists",
      "AGENT_NAME_TAKEN"
    );
  }

  const agent = await prisma.agent.create({
    data: {
      name: input.name,
      type: input.type,
      description: input.description ?? null,
      capabilities: input.capabilities
    }
  });

  return toAgentDto(agent);
}

export async function listAgents(
  query: ListAgentsQuery
): Promise<{ items: AgentDto[]; meta: PaginationMeta }> {
  const where: Prisma.AgentWhereInput = {
    ...(query.type ? { type: query.type } : {}),
    ...(query.status ? { status: query.status } : {})
  };

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      orderBy: { name: "asc" },
      ...toSkipTake(query)
    }),
    prisma.agent.count({ where })
  ]);

  return { items: agents.map(toAgentDto), meta: buildMeta(query, total) };
}

export async function getAgent(agentId: string): Promise<AgentDto> {
  return toAgentDto(await getAgentOrThrow(agentId));
}

export async function updateAgent(
  agentId: string,
  input: UpdateAgentBody
): Promise<AgentDto> {
  await getAgentOrThrow(agentId);

  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.capabilities !== undefined
        ? { capabilities: input.capabilities }
        : {})
    }
  });

  return toAgentDto(agent);
}
