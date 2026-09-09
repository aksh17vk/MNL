import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { env } from "../config/env.js";
import { UnauthorizedError } from "../lib/errors.js";

/**
 * Registers JWT signing/verification and exposes `app.authenticate`, the
 * preHandler every protected route uses.
 */
async function authPlugin(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN
    }
  });

  app.decorate(
    "authenticate",
    async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch {
        throw new UnauthorizedError("Invalid or expired access token", "INVALID_TOKEN");
      }
    }
  );
}

export default fp(authPlugin, { name: "auth-middleware" });

/** The authenticated user id, for use inside controllers. */
export function currentUserId(request: FastifyRequest): string {
  const id = request.user?.sub;

  if (!id) {
    throw new UnauthorizedError();
  }

  return id;
}
