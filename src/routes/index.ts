import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { agentRoutes } from "../modules/agents/agents.routes.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { projectRoutes } from "../modules/projects/projects.routes.js";
import {
  projectRepositoryRoutes,
  repositoryRoutes
} from "../modules/repositories/repositories.routes.js";
import {
  projectTaskRoutes,
  subtaskRoutes,
  taskRoutes
} from "../modules/tasks/tasks.routes.js";

/** Every versioned API route hangs off here, mounted at /api/v1. */
export const apiRoutes: FastifyPluginAsyncZod = async (app) => {
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(projectRoutes, { prefix: "/projects" });

  await app.register(projectRepositoryRoutes, {
    prefix: "/projects/:projectId/repositories"
  });
  await app.register(repositoryRoutes, { prefix: "/repositories" });

  await app.register(projectTaskRoutes, { prefix: "/projects/:projectId/tasks" });
  await app.register(taskRoutes, { prefix: "/tasks" });
  await app.register(subtaskRoutes, { prefix: "/subtasks" });

  await app.register(agentRoutes, { prefix: "/agents" });
};
