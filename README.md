# MNL Backend — Multiagent Negotiation Layer (Phase 1)

The backend that manages the engineering workflow a future agent layer will drive.

**Phase 1 contains no AI.** There is no LLM, no Ollama, no agent runtime, no repository
analysis, no code execution. What exists is the data model, the API, and the lifecycle
rules that an agent swarm will later plug into. The guiding rule:

> The backend manages the engineering workflow; it does not pretend to solve the
> engineering problem.

There is deliberately no heuristic standing in for intelligence — no
`if (title.includes("auth")) assignSecurityAgent()`.

---

## Stack

| Layer            | Choice                              |
| ---------------- | ----------------------------------- |
| Runtime          | Node.js 24                          |
| Language         | TypeScript (strict, ESM)            |
| Framework        | Fastify 5                           |
| Database         | PostgreSQL 16                       |
| ORM              | Prisma 7 (pg driver adapter)        |
| Auth             | JWT (`@fastify/jwt`) + scrypt       |
| Validation       | Zod 4, shared with OpenAPI          |
| Docs             | Swagger UI at `/docs`               |
| Real-time        | Socket.IO                           |
| Logging          | Pino                                |
| Tests            | Vitest                              |
| Package manager  | pnpm                                |

---

## Getting started

### 1. Start the infrastructure

```bash
docker compose up -d postgres redis
```

### 2. Configure the environment

```bash
cp .env.example .env
```

Then set a real `JWT_SECRET` (32+ characters):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Install, migrate, run

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The API is then on <http://localhost:5000>, with interactive docs at
<http://localhost:5000/docs>.

### Running everything in Docker

```bash
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))") docker compose up --build
```

Compose brings up Postgres and Redis, runs `prisma migrate deploy` as a one-shot
`migrate` service, and starts the API only once that succeeds.

---

## Scripts

| Command             | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `pnpm dev`          | Dev server with reload                              |
| `pnpm build`        | Generate the Prisma client, then compile to `dist/` |
| `pnpm start`        | Run the compiled server                             |
| `pnpm typecheck`    | `tsc --noEmit`                                      |
| `pnpm test`         | Prepare the test database, then run the suite       |
| `pnpm test:watch`   | Vitest in watch mode                                |
| `pnpm db:migrate`   | Create and apply a migration (development)          |
| `pnpm db:deploy`    | Apply existing migrations (production)              |
| `pnpm db:seed`      | Register the five starter agents                    |
| `pnpm db:studio`    | Prisma Studio                                       |
| `pnpm db:reset`     | Drop, recreate and re-migrate the database          |

---

## Environment

| Variable         | Required | Default                 | Notes                                     |
| ---------------- | -------- | ----------------------- | ----------------------------------------- |
| `NODE_ENV`       | no       | `development`           | `development` \| `test` \| `production`   |
| `PORT`           | no       | `5000`                  |                                           |
| `HOST`           | no       | `0.0.0.0`               |                                           |
| `DATABASE_URL`   | **yes**  | —                       | PostgreSQL connection string              |
| `JWT_SECRET`     | **yes**  | —                       | At least 32 characters                    |
| `JWT_EXPIRES_IN` | no       | `7d`                    |                                           |
| `REDIS_URL`      | no       | —                       | Reserved for the future queue             |
| `CORS_ORIGIN`    | no       | `http://localhost:3000` | Comma-separated list allowed              |
| `LOG_LEVEL`      | no       | by environment          | `fatal`…`trace`                           |

The server refuses to start on invalid configuration — `src/config/env.ts` validates
the environment with Zod before anything else loads. `.env` is git-ignored;
`.env.example` is committed.

---

## Architecture

```
Request
   │
   ▼  CORS → Helmet → Rate limit → JWT auth → Zod validation
Controller      reads the request, calls a service, shapes the response
   │
   ▼
Service         all business logic, ownership checks, lifecycle rules
   │
   ▼
Prisma → PostgreSQL
```

Rules the code holds to:

- **Controllers contain no business logic.** They unwrap the request, call one
  service function, and wrap the result.
- **Ownership lives in the service layer.** Each resource has one
  `assert*Access(id, userId)` function, and every read and write goes through it.
- **Nothing is formatted by hand.** Success and error envelopes come from
  `src/lib/response.ts`; every thrown error becomes an envelope in
  `src/middleware/error.middleware.ts`.
- **Lifecycle timestamps belong to the server.** `startedAt`, `completedAt` and
  `resolvedAt` are derived from the status the client sets, never accepted from it.

### Layout

```
src/
├── app.ts                  plugin registration, health endpoint
├── server.ts               listen, graceful shutdown
├── config/env.ts           Zod-validated environment
├── database/prisma.ts      Prisma client + pg adapter
├── lib/                    errors, response envelope, pagination, events, password
├── middleware/             auth (JWT), error handler
├── modules/                one folder per resource: schema, service, controller, routes
├── realtime/socket.ts      Socket.IO fan-out
└── routes/index.ts         mounts every module under /api/v1
```

---

## API

Full interactive reference: **<http://localhost:5000/docs>** (OpenAPI JSON at
`/docs/json`).

Every response uses the same envelope:

```jsonc
// success
{ "success": true, "data": { }, "message": "Task created successfully" }

// error
{ "success": false, "error": { "code": "TASK_NOT_FOUND", "message": "Task not found" } }
```

List endpoints accept `?page=&limit=` and answer with `{ items, meta }`.

| Area          | Routes                                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Auth          | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`                                                          |
| Projects      | `POST\|GET /projects`, `GET\|PATCH\|DELETE /projects/:id`                                                          |
| Repositories  | `POST\|GET /projects/:projectId/repositories`, `GET\|PATCH\|DELETE /repositories/:id`                              |
| Tasks         | `POST\|GET /projects/:projectId/tasks`, `GET\|PATCH\|DELETE /tasks/:id`                                            |
| Subtasks      | `POST\|GET /tasks/:taskId/subtasks`, `PATCH\|DELETE /subtasks/:id`                                                 |
| Agents        | `POST\|GET /agents`, `GET\|PATCH /agents/:id`                                                                      |
| Agent runs    | `POST\|GET /tasks/:taskId/agent-runs`, `GET\|PATCH /agent-runs/:id`                                                |
| Negotiations  | `POST\|GET /tasks/:taskId/negotiations`, `GET\|PATCH /negotiations/:id`                                            |
| Claims        | `POST\|GET /negotiations/:id/claims`, `GET\|PATCH\|DELETE /claims/:id`                                             |
| Evidence      | `POST\|GET /claims/:claimId/evidence`, `GET /negotiations/:negotiationId/evidence`, `GET /evidence/:id`            |
| Conflicts     | `POST\|GET /negotiations/:negotiationId/conflicts`, `GET\|PATCH /conflicts/:id`                                    |
| Decisions     | `POST\|GET /negotiations/:negotiationId/decisions`, `POST\|GET /tasks/:taskId/decisions`, `GET\|PATCH /decisions/:id` |
| Executions    | `POST\|GET /tasks/:taskId/executions`, `GET\|PATCH /executions/:id`                                                |
| Verifications | `POST\|GET /executions/:executionId/verifications`, `GET\|PATCH /verifications/:id`                                |
| System        | `GET /health`, `GET /docs`                                                                                         |

All routes are under `/api/v1` and require `Authorization: Bearer <token>` except
register, login and `/health`.

### The workflow

```
register → login → project → repository → task
  → negotiation → claims → evidence → conflict → decision
  → execution → verification
```

Rules the API enforces along the way:

- a task's repository must belong to the task's project;
- a conflict's two claims must both belong to its negotiation, and a claim cannot
  conflict with itself;
- a claim referenced by a conflict cannot be deleted;
- an execution's decision must belong to the same task;
- a decision filed under a negotiation inherits that negotiation's task.

Resources you do not own answer **404, not 403** — the API never confirms that
someone else's id exists.

---

## Real-time

Socket.IO is served on the same port. Connect with the same JWT, then subscribe to a
project or a task; subscription re-checks ownership, so a valid token alone does not
grant a room.

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", { auth: { token } });

await socket.emitWithAck("subscribe:project", projectId);
await socket.emitWithAck("subscribe:task", taskId);

socket.on("claim.created", (event) => console.log(event.name, event.payload));
```

Events emitted: `task.created`, `task.updated`, `agent.started`, `agent.completed`,
`negotiation.started`, `negotiation.completed`, `claim.created`, `evidence.added`,
`conflict.detected`, `conflict.resolved`, `decision.created`, `execution.started`,
`execution.completed`, `verification.completed`.

Services emit onto an in-process bus (`src/lib/events.ts`) and know nothing about
transports, so the future agent layer can subscribe to the same events without
touching a single service.

---

## Testing

```bash
pnpm test
```

This creates `mnl_test_db` if missing, applies migrations to it, and runs the suite —
53 tests across unit tests (password hashing, pagination, the error envelope) and
integration tests that drive the real app through `app.inject`: the auth flow, project
CRUD, the full Section 30 workflow, referential rules, and cross-user isolation on
every resource.

Postgres must be running. Point the suite at a different database with
`TEST_DATABASE_URL`.

---

## Where the AI goes

Phase 1 stops at the record. The extension points are already in place:

```
Task service  →  orchestrator  →  agent runtime  →  negotiation engine
```

- `agent_runs` is the audit trail an orchestrator will write.
- `claims`, `evidence` and `conflicts` are the negotiation substrate.
- `executions` and `verifications` are where a sandbox and a test runner will report.
- The event bus is where an agent layer subscribes.

Nothing in this phase needs to be undone to add them.
