import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { disconnectDatabase } from "../../src/database/prisma.js";
import {
  createTestApp,
  createUser,
  resetDatabase,
  type TestApp,
  type TestUser
} from "../helpers/app.js";

let app: TestApp;
let user: TestUser;

beforeAll(async () => {
  app = await createTestApp();
});

beforeEach(async () => {
  await resetDatabase();
  user = await createUser(app);
});

afterAll(async () => {
  await app.close();
  await disconnectDatabase();
});

async function createProject(name = "Payment Service") {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/projects",
    headers: user.authHeader,
    payload: { name }
  });

  return res.json().data.project as { id: string; name: string };
}

describe("projects CRUD", () => {
  it("creates a project owned by the caller", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/projects",
      headers: user.authHeader,
      payload: { name: "Payment Service", description: "Payment backend" }
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.project.userId).toBe(user.id);
  });

  it("lists only the caller's projects, newest first", async () => {
    await createProject("First");
    await createProject("Second");

    const other = await createUser(app);
    await app.inject({
      method: "POST",
      url: "/api/v1/projects",
      headers: other.authHeader,
      payload: { name: "Not mine" }
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/projects",
      headers: user.authHeader
    });

    const { items, meta } = res.json().data;
    expect(meta.total).toBe(2);
    expect(items.map((p: { name: string }) => p.name)).toEqual([
      "Second",
      "First"
    ]);
  });

  it("paginates", async () => {
    for (let i = 0; i < 3; i += 1) {
      await createProject(`Project ${i}`);
    }

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/projects?page=2&limit=2",
      headers: user.authHeader
    });

    const { items, meta } = res.json().data;
    expect(items).toHaveLength(1);
    expect(meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it("filters by status", async () => {
    const project = await createProject();
    await app.inject({
      method: "PATCH",
      url: `/api/v1/projects/${project.id}`,
      headers: user.authHeader,
      payload: { status: "ARCHIVED" }
    });
    await createProject("Still active");

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/projects?status=ARCHIVED",
      headers: user.authHeader
    });

    expect(res.json().data.meta.total).toBe(1);
  });

  it("updates a project", async () => {
    const project = await createProject();

    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/projects/${project.id}`,
      headers: user.authHeader,
      payload: { name: "Renamed" }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.project.name).toBe("Renamed");
  });

  it("rejects an empty update body", async () => {
    const project = await createProject();

    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/projects/${project.id}`,
      headers: user.authHeader,
      payload: {}
    });

    expect(res.statusCode).toBe(422);
  });

  it("deletes a project", async () => {
    const project = await createProject();

    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/projects/${project.id}`,
      headers: user.authHeader
    });

    expect(del.statusCode).toBe(200);

    const get = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.id}`,
      headers: user.authHeader
    });

    expect(get.statusCode).toBe(404);
  });
});

describe("projects access control", () => {
  it("requires authentication", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/projects" });

    expect(res.statusCode).toBe(401);
  });

  it("rejects a non-uuid id with 422", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/projects/not-a-uuid",
      headers: user.authHeader
    });

    expect(res.statusCode).toBe(422);
  });

  it("answers 404, not 403, for another user's project", async () => {
    const project = await createProject();
    const other = await createUser(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.id}`,
      headers: other.authHeader
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("stops another user from deleting a project", async () => {
    const project = await createProject();
    const other = await createUser(app);

    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/projects/${project.id}`,
      headers: other.authHeader
    });

    expect(res.statusCode).toBe(404);
  });
});
