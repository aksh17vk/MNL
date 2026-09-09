import { buildApp } from "../../src/app.js";
import { prisma } from "../../src/database/prisma.js";

export type TestApp = Awaited<ReturnType<typeof buildApp>>;

/**
 * Builds the real app — same plugins, same middleware — and drives it through
 * `inject`, so tests exercise validation and error handling exactly as HTTP
 * clients do.
 */
export async function createTestApp(): Promise<TestApp> {
  const app = await buildApp();
  await app.ready();

  return app;
}

/** Wipes every table. Cascades from users/agents reach everything else. */
export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      verifications, executions, decisions, conflicts, evidence, claims,
      negotiations, agent_runs, subtasks, tasks, repositories, projects,
      agents, users
    RESTART IDENTITY CASCADE
  `);
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
  authHeader: { authorization: string };
}

let counter = 0;

/** Registers and logs in a fresh user, returning a ready-to-use auth header. */
export async function createUser(app: TestApp): Promise<TestUser> {
  counter += 1;
  const email = `user${counter}.${Date.now()}@example.com`;
  const password = "password123";

  const registered = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { name: `User ${counter}`, email, password }
  });

  const id = registered.json().data.user.id as string;

  const loggedIn = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email, password }
  });

  const token = loggedIn.json().data.accessToken as string;

  return { id, email, token, authHeader: { authorization: `Bearer ${token}` } };
}
