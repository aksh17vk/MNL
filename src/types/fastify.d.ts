import type { FastifyReply, FastifyRequest } from "fastify";

import type { AuthTokenPayload } from "./auth.js";

declare module "fastify" {
  interface FastifyInstance {
    /** preHandler that rejects the request unless a valid bearer token is present. */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}
