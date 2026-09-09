import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { authRoutes } from "../modules/auth/auth.routes.js";

/** Every versioned API route hangs off here, mounted at /api/v1. */
export const apiRoutes: FastifyPluginAsyncZod = async (app) => {
  await app.register(authRoutes, { prefix: "/auth" });
};
