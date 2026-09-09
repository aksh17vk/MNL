/**
 * Seeds the agent registry.
 *
 * These are registry entries only — metadata describing what an agent would be
 * responsible for. Nothing runs; the AI layer arrives in a later phase.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const agents = [
  {
    name: "Backend Agent",
    type: "BACKEND" as const,
    description: "Handles backend engineering tasks",
    capabilities: ["backend_analysis", "api_review", "refactoring"]
  },
  {
    name: "Security Agent",
    type: "SECURITY" as const,
    description: "Reviews authentication, authorisation and data exposure",
    capabilities: ["threat_model", "dependency_audit", "authz_review"]
  },
  {
    name: "QA Agent",
    type: "QA" as const,
    description: "Designs and reviews test coverage",
    capabilities: ["test_design", "regression_analysis", "coverage_review"]
  },
  {
    name: "Database Agent",
    type: "DATABASE" as const,
    description: "Reviews schema design, migrations and query performance",
    capabilities: ["schema_review", "migration_review", "query_analysis"]
  },
  {
    name: "DevOps Agent",
    type: "DEVOPS" as const,
    description: "Reviews build, deployment and runtime configuration",
    capabilities: ["ci_review", "container_review", "observability_review"]
  }
];

async function main() {
  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { name: agent.name },
      update: {
        type: agent.type,
        description: agent.description,
        capabilities: agent.capabilities
      },
      create: agent
    });
  }

  console.log(`Seeded ${agents.length} agents`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
