import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import {
  agentRunRoutes,
  taskAgentRunRoutes
} from "../modules/agents/agentRuns.routes.js";
import { agentRoutes } from "../modules/agents/agents.routes.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import {
  conflictRoutes,
  negotiationConflictRoutes
} from "../modules/conflicts/conflicts.routes.js";
import {
  decisionRoutes,
  negotiationDecisionRoutes,
  taskDecisionRoutes
} from "../modules/decisions/decisions.routes.js";
import {
  claimEvidenceRoutes,
  evidenceRoutes,
  negotiationEvidenceRoutes
} from "../modules/evidence/evidence.routes.js";
import {
  executionRoutes,
  taskExecutionRoutes
} from "../modules/executions/executions.routes.js";
import {
  claimRoutes,
  negotiationRoutes,
  taskNegotiationRoutes
} from "../modules/negotiations/negotiations.routes.js";
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
import {
  executionVerificationRoutes,
  verificationRoutes
} from "../modules/verifications/verifications.routes.js";

/** Every versioned API route hangs off here, mounted at /api/v1. */
export const apiRoutes: FastifyPluginAsyncZod = async (app) => {
  await app.register(authRoutes, { prefix: "/auth" });

  // Projects and what hangs off them
  await app.register(projectRoutes, { prefix: "/projects" });
  await app.register(projectRepositoryRoutes, {
    prefix: "/projects/:projectId/repositories"
  });
  await app.register(projectTaskRoutes, { prefix: "/projects/:projectId/tasks" });
  await app.register(repositoryRoutes, { prefix: "/repositories" });

  // Tasks and what hangs off them
  await app.register(taskRoutes, { prefix: "/tasks" });
  await app.register(subtaskRoutes, { prefix: "/subtasks" });
  await app.register(taskAgentRunRoutes, { prefix: "/tasks/:taskId/agent-runs" });
  await app.register(taskNegotiationRoutes, {
    prefix: "/tasks/:taskId/negotiations"
  });
  await app.register(taskDecisionRoutes, { prefix: "/tasks/:taskId/decisions" });
  await app.register(taskExecutionRoutes, {
    prefix: "/tasks/:taskId/executions"
  });

  // Agent registry and its run log
  await app.register(agentRoutes, { prefix: "/agents" });
  await app.register(agentRunRoutes, { prefix: "/agent-runs" });

  // Negotiation and what hangs off it
  await app.register(negotiationRoutes, { prefix: "/negotiations" });
  await app.register(negotiationEvidenceRoutes, {
    prefix: "/negotiations/:negotiationId/evidence"
  });
  await app.register(negotiationConflictRoutes, {
    prefix: "/negotiations/:negotiationId/conflicts"
  });
  await app.register(negotiationDecisionRoutes, {
    prefix: "/negotiations/:negotiationId/decisions"
  });

  await app.register(claimRoutes, { prefix: "/claims" });
  await app.register(claimEvidenceRoutes, {
    prefix: "/claims/:claimId/evidence"
  });
  await app.register(evidenceRoutes, { prefix: "/evidence" });
  await app.register(conflictRoutes, { prefix: "/conflicts" });
  await app.register(decisionRoutes, { prefix: "/decisions" });

  // Execution and verification
  await app.register(executionRoutes, { prefix: "/executions" });
  await app.register(executionVerificationRoutes, {
    prefix: "/executions/:executionId/verifications"
  });
  await app.register(verificationRoutes, { prefix: "/verifications" });
};
