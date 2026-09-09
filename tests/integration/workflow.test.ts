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

const post = (url: string, payload: unknown, as: TestUser = user) =>
  app.inject({ method: "POST", url, headers: as.authHeader, payload });

const patch = (url: string, payload: unknown, as: TestUser = user) =>
  app.inject({ method: "PATCH", url, headers: as.authHeader, payload });

const get = (url: string, as: TestUser = user) =>
  app.inject({ method: "GET", url, headers: as.authHeader });

/** Walks the Section 30 flow and hands back every id it created. */
async function buildWorkflow() {
  const project = (await post("/api/v1/projects", { name: "MNL" })).json().data
    .project;

  const repository = (
    await post(`/api/v1/projects/${project.id}/repositories`, {
      name: "auth-api",
      provider: "github",
      url: "https://github.com/acme/auth-api"
    })
  ).json().data.repository;

  const task = (
    await post(`/api/v1/projects/${project.id}/tasks`, {
      title: "Fix authentication bug",
      repositoryId: repository.id,
      priority: "HIGH"
    })
  ).json().data.task;

  const agent = (
    await post("/api/v1/agents", {
      name: `Backend Agent ${Date.now()}`,
      type: "backend",
      capabilities: ["backend_analysis"]
    })
  ).json().data.agent;

  const negotiation = (
    await post(`/api/v1/tasks/${task.id}/negotiations`, {})
  ).json().data.negotiation;

  const claimA = (
    await post(`/api/v1/negotiations/${negotiation.id}/claims`, {
      content: "Middleware rejects expired tokens.",
      type: "PROPOSAL"
    })
  ).json().data.claim;

  const claimB = (
    await post(`/api/v1/negotiations/${negotiation.id}/claims`, {
      content: "Refresh should reissue first.",
      type: "HYPOTHESIS"
    })
  ).json().data.claim;

  return { project, repository, task, agent, negotiation, claimA, claimB };
}

describe("the Phase 1 workflow end to end", () => {
  it("carries a task from creation to a passing verification", async () => {
    const w = await buildWorkflow();

    const evidence = await post(`/api/v1/claims/${w.claimA.id}/evidence`, {
      type: "test",
      source: "manual",
      content: "Test reproduces the failure.",
      reliability: 0.9
    });
    expect(evidence.statusCode).toBe(201);

    const conflict = await post(
      `/api/v1/negotiations/${w.negotiation.id}/conflicts`,
      {
        claimAId: w.claimA.id,
        claimBId: w.claimB.id,
        type: "approach_conflict"
      }
    );
    expect(conflict.statusCode).toBe(201);

    const decision = await post(
      `/api/v1/negotiations/${w.negotiation.id}/decisions`,
      { type: "hybrid", reason: "Both proposals are required." }
    );
    expect(decision.statusCode).toBe(201);
    // The decision hangs off the negotiation's task without being told.
    expect(decision.json().data.decision.taskId).toBe(w.task.id);

    const execution = await post(`/api/v1/tasks/${w.task.id}/executions`, {
      decisionId: decision.json().data.decision.id,
      environment: "node-24"
    });
    expect(execution.statusCode).toBe(201);

    const executionId = execution.json().data.execution.id;
    const verification = await post(
      `/api/v1/executions/${executionId}/verifications`,
      { type: "unit_test" }
    );
    expect(verification.statusCode).toBe(201);

    const passed = await patch(
      `/api/v1/verifications/${verification.json().data.verification.id}`,
      { status: "PASSED", output: "12 passed" }
    );
    expect(passed.json().data.verification.status).toBe("PASSED");
  });

  it("sets lifecycle timestamps from the status, not from the client", async () => {
    const w = await buildWorkflow();

    expect(w.negotiation.startedAt).toBeNull();

    const active = await patch(`/api/v1/negotiations/${w.negotiation.id}`, {
      status: "ACTIVE"
    });
    expect(active.json().data.negotiation.startedAt).not.toBeNull();
    expect(active.json().data.negotiation.completedAt).toBeNull();

    const done = await patch(`/api/v1/negotiations/${w.negotiation.id}`, {
      status: "COMPLETED"
    });
    expect(done.json().data.negotiation.completedAt).not.toBeNull();
  });

  it("clears resolvedAt when a conflict is reopened", async () => {
    const w = await buildWorkflow();

    const conflict = (
      await post(`/api/v1/negotiations/${w.negotiation.id}/conflicts`, {
        claimAId: w.claimA.id,
        claimBId: w.claimB.id,
        type: "FILE_CONFLICT"
      })
    ).json().data.conflict;

    const resolved = await patch(`/api/v1/conflicts/${conflict.id}`, {
      status: "RESOLVED"
    });
    expect(resolved.json().data.conflict.resolvedAt).not.toBeNull();

    const reopened = await patch(`/api/v1/conflicts/${conflict.id}`, {
      status: "OPEN"
    });
    expect(reopened.json().data.conflict.resolvedAt).toBeNull();
  });
});

describe("referential rules", () => {
  it("refuses a repository from another project", async () => {
    const w = await buildWorkflow();
    const other = (
      await post("/api/v1/projects", { name: "Other project" })
    ).json().data.project;

    const res = await post(`/api/v1/projects/${other.id}/tasks`, {
      title: "Cross-project task",
      repositoryId: w.repository.id
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("REPOSITORY_NOT_IN_PROJECT");
  });

  it("refuses a conflict between a claim and itself", async () => {
    const w = await buildWorkflow();

    const res = await post(`/api/v1/negotiations/${w.negotiation.id}/conflicts`, {
      claimAId: w.claimA.id,
      claimBId: w.claimA.id,
      type: "FILE_CONFLICT"
    });

    expect(res.statusCode).toBe(422);
  });

  it("refuses a conflict whose claims sit in another negotiation", async () => {
    const w = await buildWorkflow();
    const second = (
      await post(`/api/v1/tasks/${w.task.id}/negotiations`, {})
    ).json().data.negotiation;

    const res = await post(`/api/v1/negotiations/${second.id}/conflicts`, {
      claimAId: w.claimA.id,
      claimBId: w.claimB.id,
      type: "FILE_CONFLICT"
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("CLAIM_NOT_IN_NEGOTIATION");
  });

  it("keeps a claim that a conflict references", async () => {
    const w = await buildWorkflow();
    await post(`/api/v1/negotiations/${w.negotiation.id}/conflicts`, {
      claimAId: w.claimA.id,
      claimBId: w.claimB.id,
      type: "FILE_CONFLICT"
    });

    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/claims/${w.claimA.id}`,
      headers: user.authHeader
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("CLAIM_IN_CONFLICT");
  });

  it("refuses an execution whose decision belongs to another task", async () => {
    const w = await buildWorkflow();

    const res = await post(`/api/v1/tasks/${w.task.id}/executions`, {
      decisionId: "00000000-0000-4000-8000-000000000000"
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("DECISION_NOT_IN_TASK");
  });

  it("refuses a subtask assigned to an agent that does not exist", async () => {
    const w = await buildWorkflow();

    const res = await post(`/api/v1/tasks/${w.task.id}/subtasks`, {
      title: "Investigate",
      assignedAgentId: "00000000-0000-4000-8000-000000000000"
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("AGENT_NOT_FOUND");
  });

  it("rejects an unknown enum value", async () => {
    const w = await buildWorkflow();

    const res = await post(`/api/v1/negotiations/${w.negotiation.id}/decisions`, {
      type: "NOT_A_REAL_TYPE"
    });

    expect(res.statusCode).toBe(422);
  });

  it("rejects a reliability score outside 0..1", async () => {
    const w = await buildWorkflow();

    const res = await post(`/api/v1/claims/${w.claimA.id}/evidence`, {
      type: "CODE",
      source: "manual",
      content: "x",
      reliability: 5
    });

    expect(res.statusCode).toBe(422);
  });
});

describe("ownership isolation", () => {
  it("hides every nested resource from another user", async () => {
    const w = await buildWorkflow();
    const evidence = (
      await post(`/api/v1/claims/${w.claimA.id}/evidence`, {
        type: "CODE",
        source: "manual",
        content: "x"
      })
    ).json().data.evidence;

    const execution = (
      await post(`/api/v1/tasks/${w.task.id}/executions`, {})
    ).json().data.execution;

    const other = await createUser(app);

    const urls = [
      `/api/v1/projects/${w.project.id}`,
      `/api/v1/repositories/${w.repository.id}`,
      `/api/v1/tasks/${w.task.id}`,
      `/api/v1/negotiations/${w.negotiation.id}`,
      `/api/v1/claims/${w.claimA.id}`,
      `/api/v1/evidence/${evidence.id}`,
      `/api/v1/executions/${execution.id}`
    ];

    for (const url of urls) {
      const res = await get(url, other);
      expect(res.statusCode, url).toBe(404);
    }
  });

  it("shares the agent registry across users", async () => {
    const w = await buildWorkflow();
    const other = await createUser(app);

    const res = await get(`/api/v1/agents/${w.agent.id}`, other);

    expect(res.statusCode).toBe(200);
  });
});

describe("system endpoints", () => {
  it("reports a healthy service and a reachable database", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.database).toBe("up");
  });

  it("answers an unknown route with the standard error envelope", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/nope" });

    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("publishes an OpenAPI document covering every module", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    const paths = Object.keys(res.json().paths);

    expect(paths).toContain("/api/v1/auth/login");
    expect(paths).toContain("/api/v1/negotiations/{id}/claims");
    expect(paths).toContain("/api/v1/executions/{executionId}/verifications/");
  });
});
