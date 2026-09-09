import { PrismaPg } from "@prisma/adapter-pg";

import { env, isProduction } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";

// Prisma 7 connects through a driver adapter — the connection string lives in
// the environment, not in schema.prisma.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: isProduction ? ["error"] : ["warn", "error"]
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
